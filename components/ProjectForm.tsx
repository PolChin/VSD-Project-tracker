
import React, { useState, useEffect } from 'react';
import { db, collection, doc, writeBatch, serverTimestamp } from '../firebase';
import { Project, MasterData, Task } from '../types';
import { Plus, Trash2, Save, X, Activity, Info, FileText, AlignLeft, Target } from 'lucide-react';

interface ProjectFormProps {
  masterData: MasterData;
  onComplete: () => void;
  initialProject?: Project;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ masterData, onComplete, initialProject }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialProject?.name || '',
    description: initialProject?.description || '',
    leader: initialProject?.leader || '',
    department: initialProject?.department || '',
    status: initialProject?.status || '',
    progress: initialProject?.progress || 0,
    tasks: initialProject?.tasks || [] as Task[]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Please enter a project name");
    if (!formData.status) return alert("Please select a project status");
    if (formData.tasks.length === 0) return alert("Please add at least one task");
    
    if (totalWeight !== 100 && totalWeight !== 0) {
      if (!confirm(`Total weight is ${totalWeight}%. For correct reporting, weights should ideally total 100%. Proceed anyway?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      const projectRef = isEditMode 
        ? doc(db, 'projects', initialProject!.id)
        : doc(collection(db, 'projects'));
        
      const historyRef = doc(collection(db, 'projects_history'));
      
      const timestamp = serverTimestamp();
      const projectData = {
        ...formData,
        updatedAt: timestamp
      };

      batch.set(projectRef, projectData, { merge: true });
      batch.set(historyRef, {
        ...projectData,
        projectId: projectRef.id
      });

      await batch.commit();
      onComplete();
    } catch (err) {
      console.error("Save error", err);
      alert("Failed to save project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white glass rounded-3xl p-6 shadow-2xl w-full border border-white/50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isEditMode ? 'Modify' : 'Deploy'} <span className="text-indigo-600">Project Matrix</span>
          </h3>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">
            Operational Scope & Deployment Matrix
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <div className="group">
            <label className="block text-[9px] font-black uppercase text-indigo-900/60 mb-1.5 tracking-widest ml-1">IDENTITY</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300"
              placeholder="Smart Logistics Phase 1"
            />
          </div>

          <div className="group">
            <label className="block text-[9px] font-black uppercase text-indigo-900/60 mb-1.5 tracking-widest ml-1 flex items-center gap-1">
              <FileText size={10} /> SUMMARY
            </label>
            <textarea 
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-xs font-medium text-slate-700 resize-none shadow-inner"
              placeholder="High-level project goals..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-[9px] font-black uppercase text-indigo-900/60 mb-1.5 tracking-widest ml-1">LEADERSHIP</label>
              <select 
                required
                value={formData.leader}
                onChange={e => setFormData({ ...formData, leader: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-xs font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">Select Leader</option>
                {masterData.leaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="group">
              <label className="block text-[9px] font-black uppercase text-indigo-900/60 mb-1.5 tracking-widest ml-1">DEPARTMENT</label>
              <select 
                required
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-xs font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">Select Dept</option>
                {masterData.departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 flex flex-col justify-center shadow-inner relative overflow-hidden">
          <div className="flex justify-between items-end mb-4 relative z-10">
            <label className="block text-[10px] font-black uppercase text-indigo-900/50 tracking-widest">MASTER PROGRESS</label>
            <span className="text-4xl font-black text-indigo-700 leading-none">{formData.progress}%</span>
          </div>
          <div className="w-full h-4 bg-white/60 rounded-full overflow-hidden p-0.5 shadow-inner relative z-10">
             <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-700"
              style={{ width: `${formData.progress}%` }}
             />
          </div>
          
          <div className="mt-6 relative z-10">
            <label className="block text-[9px] font-black uppercase text-indigo-900/60 mb-1.5 tracking-widest ml-1">DEPLOYMENT STATUS</label>
            <select 
              required
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-[10px] font-black uppercase text-slate-800 tracking-wider appearance-none cursor-pointer shadow-sm"
            >
              <option value="">Select Status</option>
              {masterData.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
          <div className="flex flex-col">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-indigo-600" size={16} />
              Roadmap Tracking
            </h4>
            <span className={`text-[9px] font-black mt-1 ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              Sum: {totalWeight}% / 100%
            </span>
          </div>
          <button 
            type="button" 
            onClick={handleAddTask}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-[10px] shadow-lg shadow-indigo-100 uppercase"
          >
            <Plus size={14} /> APPEND TASK
          </button>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
          {formData.tasks.map((task) => (
            <div key={task.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group border-l-4 border-l-indigo-400">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-5 space-y-2">
                   <input 
                      type="text" 
                      value={task.name}
                      onChange={e => updateTask(task.id, 'name', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500/20"
                      placeholder="Task Identity..."
                    />
                    <input 
                      type="text"
                      value={task.description}
                      onChange={e => updateTask(task.id, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-medium text-slate-500 outline-none"
                      placeholder="Brief details..."
                    />
                </div>

                <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                   <input 
                      type="date" 
                      value={task.startDate}
                      onChange={e => updateTask(task.id, 'startDate', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-700 outline-none"
                    />
                    <input 
                      type="date" 
                      value={task.endDate}
                      onChange={e => updateTask(task.id, 'endDate', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-700 outline-none"
                    />
                </div>

                <div className="lg:col-span-3 flex items-center gap-4 px-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Weight</span>
                      <input 
                        type="number" 
                        value={task.weight}
                        onChange={e => updateTask(task.id, 'weight', parseInt(e.target.value) || 0)}
                        className="w-12 bg-white border border-slate-200 rounded-lg px-1 py-1 text-[10px] font-black text-indigo-600 text-center"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Done</span>
                        <span className="text-[9px] font-black text-indigo-600">{task.progress}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100"
                        value={task.progress}
                        onChange={e => updateTask(task.id, 'progress', parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                </div>

                <div className="lg:col-span-1 flex justify-end">
                  <button 
                    type="button"
                    onClick={() => handleRemoveTask(task.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100">
        <button 
          type="button"
          onClick={onComplete}
          className="px-6 py-2 rounded-xl font-black text-slate-400 hover:text-slate-600 text-[10px] uppercase tracking-widest transition-all"
        >
          DISCARD
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="px-10 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 text-[10px] uppercase tracking-widest"
        >
          {loading ? 'SYNCING...' : isEditMode ? 'SAVE CHANGES' : 'DEPLOY PROJECT'}
          {!loading && <Save size={14} />}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
