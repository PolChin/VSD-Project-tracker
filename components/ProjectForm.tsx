
import React, { useState, useEffect } from 'react';
import { db, collection, doc, writeBatch, query, orderBy, limit, getDocs } from '../firebase';
import { Project, MasterData, Task, Milestone } from '../types';
import { Plus, Trash2, Save, Activity, FileText, Calendar, Flag, AlertCircle } from 'lucide-react';

interface ProjectFormProps {
  masterData: MasterData;
  onComplete: () => void;
  initialProject?: Project;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ masterData, onComplete, initialProject }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const sanitizeTasks = (tasks?: Task[]): Task[] => {
    if (!tasks) return [];
    return tasks.map(t => ({
      id: String(t.id),
      name: String(t.name || ''),
      description: String(t.description || ''),
      startDate: String(t.startDate || ''),
      endDate: String(t.endDate || ''),
      progress: Number(t.progress || 0),
      weight: Number(t.weight || 0)
    }));
  };

  const sanitizeMilestones = (milestones?: Milestone[]): Milestone[] => {
    if (!milestones) return [];
    return milestones.map(m => ({
      id: String(m.id),
      name: String(m.name || ''),
      description: String(m.description || ''),
      date: String(m.date || '')
    }));
  };

  const [formData, setFormData] = useState({
    name: initialProject?.name || '',
    description: initialProject?.description || '',
    leader: initialProject?.leader || '',
    department: initialProject?.department || '',
    status: initialProject?.status || '',
    progress: initialProject?.progress || 0,
    tasks: sanitizeTasks(initialProject?.tasks),
    milestones: sanitizeMilestones(initialProject?.milestones)
  });

  const isEditMode = !!initialProject;
  const totalWeight = formData.tasks.reduce((sum, task) => sum + (task.weight || 0), 0);

  useEffect(() => {
    if (formData.tasks.length > 0) {
      const calculatedProgress = formData.tasks.reduce((acc, task) => {
        const weightFactor = totalWeight > 0 ? (task.weight || 0) / totalWeight : 1 / formData.tasks.length;
        return acc + (task.progress * weightFactor);
      }, 0);
      
      setFormData(prev => ({ ...prev, progress: Math.round(calculatedProgress) }));
    } else {
      setFormData(prev => ({ ...prev, progress: 0 }));
    }
  }, [formData.tasks, totalWeight]);

  const handleAddTask = () => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      weight: 0
    };
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    if (errors.tasks) setErrors(prev => { const n = {...prev}; delete n.tasks; return n; });
  };

  const handleRemoveTask = (id: string) => {
    setFormData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  };

  const updateTask = (id: string, field: keyof Task, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    };
    setFormData(prev => ({ ...prev, milestones: [...prev.milestones, newMilestone] }));
  };

  const handleRemoveMilestone = (id: string) => {
    setFormData(prev => ({ ...prev, milestones: prev.milestones.filter(m => m.id !== id) }));
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Project name is required";
    if (!formData.leader) newErrors.leader = "Project leader is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.status) newErrors.status = "Project status is required";
    if (formData.tasks.length === 0) newErrors.tasks = "At least one task is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateNextProjectId = async () => {
    const currentYear = new Date().getFullYear().toString();
    const prefix = `P${currentYear}`;
    
    const projectsRef = collection(db, 'projects');
    const q = query(
      projectsRef,
      orderBy('__name__', 'desc'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    const lastProjectInYear = querySnapshot.docs.find(doc => doc.id.startsWith(prefix));
    
    if (!lastProjectInYear) {
      return `${prefix}001`;
    } else {
      const lastId = lastProjectInYear.id;
      const lastSequenceStr = lastId.substring(prefix.length);
      const lastSequence = parseInt(lastSequenceStr, 10);
      const nextSequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
      return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (totalWeight !== 100 && totalWeight !== 0) {
      if (!confirm(`Total weight is ${totalWeight}%. Weights should ideally total 100%. Proceed?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      let projectRef;
      if (isEditMode) {
        projectRef = doc(db, 'projects', initialProject!.id);
      } else {
        const nextId = await generateNextProjectId();
        projectRef = doc(db, 'projects', nextId);
      }
        
      const batch = writeBatch(db);
      // Use client-side timestamp as ISO string to avoid FieldValue circular reference issues
      const timestampStr = new Date().toISOString();
      
      const documentData = {
        name: String(formData.name),
        description: String(formData.description || ''),
        leader: String(formData.leader),
        department: String(formData.department),
        status: String(formData.status),
        progress: Number(formData.progress),
        tasks: sanitizeTasks(formData.tasks),
        milestones: sanitizeMilestones(formData.milestones),
        updatedAt: timestampStr
      };

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      const hh = now.getHours().toString().padStart(2, '0');
      const min = now.getMinutes().toString().padStart(2, '0');
      
      const historyDocId = `${projectRef.id}_${yyyy}${mm}${dd}_${hh}${min}`;
      const historyRef = doc(db, 'projects_history', historyDocId);

      batch.set(projectRef, documentData, { merge: true });
      batch.set(historyRef, {
        ...documentData,
        projectId: projectRef.id
      });

      await batch.commit();
      onComplete();
    } catch (err: any) {
      console.error("Save error:", err?.message || "Internal Error");
      alert("Failed to save project. " + (err?.message || "Check console for details."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 glass rounded-3xl p-6 shadow-2xl w-full border border-white/50 dark:border-slate-800">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isEditMode ? 'Modify Project' : 'Create New Project'}
          </h3>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <div className="group">
            <label className="block text-[9px] font-black uppercase text-indigo-900/60 dark:text-indigo-400 mb-1.5 tracking-widest ml-1">
              PROJECT NAME <span className="text-rose-500 font-bold">*</span>
            </label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors(prev => { const n = {...prev}; delete n.name; return n; });
              }}
              className={`w-full bg-slate-50 dark:bg-slate-800 border ${errors.name ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/30 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600`}
              placeholder="Project Name"
            />
            {errors.name && <div className="mt-1 flex items-center gap-1 text-rose-500 text-[9px] font-bold uppercase"><AlertCircle size={10} /> {errors.name}</div>}
          </div>

          <div className="group">
            <label className="block text-[9px] font-black uppercase text-indigo-900/60 dark:text-indigo-400 mb-1.5 tracking-widest ml-1 flex items-center gap-1">
              <FileText size={10} /> SHORT DESCRIPTION
            </label>
            <textarea 
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/30 focus:bg-white dark:focus:bg-slate-900 transition-all text-xs font-medium text-slate-700 dark:text-slate-300 resize-none shadow-inner"
              placeholder="High-level project goals..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-[9px] font-black uppercase text-indigo-900/60 dark:text-indigo-400 mb-1.5 tracking-widest ml-1">
                LEADER <span className="text-rose-500 font-bold">*</span>
              </label>
              <select 
                value={formData.leader}
                onChange={e => {
                  setFormData({ ...formData, leader: e.target.value });
                  if (errors.leader) setErrors(prev => { const n = {...prev}; delete n.leader; return n; });
                }}
                className={`w-full bg-slate-50 dark:bg-slate-800 border ${errors.leader ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/30 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 appearance-none cursor-pointer`}
              >
                <option value="" className="dark:bg-slate-800">Select Leader</option>
                {masterData.leaders.map(l => <option key={l} value={l} className="dark:bg-slate-800">{l}</option>)}
              </select>
              {errors.leader && <div className="mt-1 flex items-center gap-1 text-rose-500 text-[9px] font-bold uppercase"><AlertCircle size={10} /> {errors.leader}</div>}
            </div>
            <div className="group">
              <label className="block text-[9px] font-black uppercase text-indigo-900/60 dark:text-indigo-400 mb-1.5 tracking-widest ml-1">
                DEPARTMENT <span className="text-rose-500 font-bold">*</span>
              </label>
              <select 
                value={formData.department}
                onChange={e => {
                  setFormData({ ...formData, department: e.target.value });
                  if (errors.department) setErrors(prev => { const n = {...prev}; delete n.department; return n; });
                }}
                className={`w-full bg-slate-50 dark:bg-slate-800 border ${errors.department ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/30 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 appearance-none cursor-pointer`}
              >
                <option value="" className="dark:bg-slate-800">Select Dept</option>
                {masterData.departments.map(d => <option key={d} value={d} className="dark:bg-slate-800">{d}</option>)}
              </select>
              {errors.department && <div className="mt-1 flex items-center gap-1 text-rose-500 text-[9px] font-bold uppercase"><AlertCircle size={10} /> {errors.department}</div>}
            </div>
          </div>
        </div>

        <div className="bg-indigo-50/50 dark:bg-slate-800/50 rounded-3xl p-6 border border-indigo-100 dark:border-slate-700 flex flex-col justify-center shadow-inner relative overflow-hidden">
          <div className="flex justify-between items-end mb-4 relative z-10">
            <label className="block text-[10px] font-black uppercase text-indigo-900/50 dark:text-indigo-400/50 tracking-widest">MASTER PROGRESS</label>
            <span className="text-4xl font-black text-indigo-700 dark:text-indigo-400 leading-none">{formData.progress}%</span>
          </div>
          <div className="w-full h-4 bg-white/60 dark:bg-slate-900/60 rounded-full overflow-hidden p-0.5 shadow-inner relative z-10">
             <div 
              className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-700"
              style={{ width: `${formData.progress}%` }}
             />
          </div>
          
          <div className="mt-6 relative z-10">
            <label className="block text-[9px] font-black uppercase text-indigo-900/60 dark:text-indigo-400 mb-1.5 tracking-widest ml-1">
              STATUS <span className="text-rose-500 font-bold">*</span>
            </label>
            <select 
              value={formData.status}
              onChange={e => {
                setFormData({ ...formData, status: e.target.value });
                if (errors.status) setErrors(prev => { const n = {...prev}; delete n.status; return n; });
              }}
              className={`w-full bg-white dark:bg-slate-800 border ${errors.status ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/30 transition-all text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider appearance-none cursor-pointer shadow-sm`}
            >
              <option value="" className="dark:bg-slate-800">Select Status</option>
              {masterData.statuses.map(s => <option key={s.id} value={s.name} className="dark:bg-slate-800">{s.name}</option>)}
            </select>
            {errors.status && <div className="mt-1 flex items-center gap-1 text-rose-500 text-[9px] font-bold uppercase"><AlertCircle size={10} /> {errors.status}</div>}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-10">
        <div className="flex flex-col">
          <div className={`flex justify-between items-center mb-4 ${errors.tasks ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30' : 'bg-indigo-50/50 dark:bg-slate-800/50 border-indigo-100/50 dark:border-slate-700'} p-4 rounded-2xl border`}>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className={errors.tasks ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'} size={16} />
              Tasks <span className="text-rose-500 font-bold">*</span>
            </h4>
            <button 
              type="button" 
              onClick={handleAddTask}
              className={`flex items-center gap-1.5 px-4 py-2 ${errors.tasks ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400'} text-white rounded-xl transition-all font-black text-[10px] shadow-sm uppercase tracking-widest`}
            >
              <Plus size={14} /> ADD TASK
            </button>
          </div>
          {errors.tasks && <div className="mb-4 flex items-center gap-1 text-rose-500 text-[10px] font-bold uppercase px-4"><AlertCircle size={12} /> {errors.tasks}</div>}
          
          <div className="space-y-3">
            {formData.tasks.map((task) => (
              <div key={task.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm border-l-4 border-l-indigo-400 dark:border-l-indigo-500">
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                   <div className="flex-grow w-full lg:w-auto grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-widest">TASK NAME</label>
                        <input 
                          type="text" 
                          value={task.name}
                          onChange={e => updateTask(task.id, 'name', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500/30"
                          placeholder="Task name"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-widest">DESCRIPTION</label>
                        <input 
                          type="text" 
                          value={task.description || ''}
                          onChange={e => updateTask(task.id, 'description', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500/30"
                          placeholder="Brief description of the task..."
                        />
                      </div>
                   </div>

                   <div className="w-full lg:w-64 grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-widest">START DATE</label>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                            <Calendar size={12} className="text-indigo-500" />
                            <input 
                              type="date" 
                              value={task.startDate}
                              onChange={e => updateTask(task.id, 'startDate', e.target.value)}
                              className="w-full text-[10px] font-bold text-slate-800 dark:text-slate-200 border-none bg-transparent outline-none cursor-pointer"
                            />
                        </div>
                     </div>
                     <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-widest">END DATE</label>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                            <Calendar size={12} className="text-rose-500" />
                            <input 
                              type="date" 
                              value={task.endDate}
                              onChange={e => updateTask(task.id, 'endDate', e.target.value)}
                              className="w-full text-[10px] font-bold text-slate-800 dark:text-slate-200 border-none bg-transparent outline-none cursor-pointer"
                            />
                        </div>
                     </div>
                   </div>

                   <div className="w-full lg:w-72 flex items-center gap-6">
                      <div className="flex-grow">
                         <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5">
                            <span>PROGRESS</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{task.progress}%</span>
                         </div>
                         <div className="flex items-center h-5">
                            <input 
                              type="range" 
                              min="0" max="100" 
                              value={task.progress} 
                              onChange={e => updateTask(task.id, 'progress', parseInt(e.target.value))} 
                              className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500" 
                            />
                         </div>
                      </div>
                      <div className="w-16">
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 text-center">WEIGHT</label>
                        <input 
                          type="number" 
                          value={task.weight} 
                          onChange={e => updateTask(task.id, 'weight', parseInt(e.target.value) || 0)} 
                          className="w-full text-[11px] font-black text-center border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 focus:ring-1 focus:ring-indigo-500/30" 
                        />
                      </div>
                      <button type="button" onClick={() => handleRemoveTask(task.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 p-2 transition-colors"><Trash2 size={16} /></button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4 bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Flag className="text-rose-600 dark:text-rose-400" size={16} />
              Project Milestones
            </h4>
            <button 
              type="button" 
              onClick={handleAddMilestone}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 dark:bg-rose-500 text-white rounded-xl transition-all font-black text-[10px] shadow-sm uppercase tracking-widest"
            >
              <Plus size={14} /> ADD MILESTONE
            </button>
          </div>
          <div className="space-y-3">
            {formData.milestones.map((milestone) => (
              <div key={milestone.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm border-l-4 border-l-rose-400 dark:border-l-rose-500">
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                   <div className="flex-grow w-full lg:w-auto grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-widest">MILESTONE NAME</label>
                        <input 
                          type="text" 
                          value={milestone.name}
                          onChange={e => updateMilestone(milestone.id, 'name', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white outline-none"
                          placeholder="Name of milestone"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-widest">DESCRIPTION</label>
                        <input 
                          type="text" 
                          value={milestone.description || ''}
                          onChange={e => updateMilestone(milestone.id, 'description', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 outline-none"
                          placeholder="Criteria for success..."
                        />
                      </div>
                   </div>
                   
                   <div className="w-full lg:w-72 flex items-center gap-6">
                      <div className="flex-grow">
                        <label className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 tracking-widest">TARGET DATE</label>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
                          <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                          <input 
                            type="date" 
                            value={milestone.date}
                            onChange={e => updateMilestone(milestone.id, 'date', e.target.value)}
                            className="w-full text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none bg-transparent"
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveMilestone(milestone.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 p-2 mt-4"><Trash2 size={16} /></button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
        <button 
          type="button"
          onClick={onComplete}
          className="px-8 py-2.5 rounded-xl font-black text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] uppercase tracking-widest transition-all"
        >
          CANCEL
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="px-12 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-black shadow-xl hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all flex items-center gap-2 disabled:opacity-50 text-[10px] uppercase tracking-[0.1em]"
        >
          {loading ? 'SYNCING...' : isEditMode ? 'SAVE CHANGES' : 'SUBMIT'}
          {!loading && <Save size={16} />}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
