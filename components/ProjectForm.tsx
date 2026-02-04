
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
    status: initialProject?.status || masterData.statuses[0]?.name || '',
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
    <form onSubmit={handleSubmit} className="bg-white glass rounded-[2.5rem] p-10 shadow-2xl w-full border border-white/50">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {isEditMode ? 'Modify' : 'Deploy'} <span className="text-indigo-600">Project Matrix</span>
          </h3>
          <p className="text-slate-500 font-medium text-lg mt-1">
            {isEditMode ? 'Updating existing scope and delivery metrics' : 'Initialize scope, leadership, and operational scheduling'}
          </p>
        </div>
      </div>
      
      {/* Top Section: Project Identity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
        <div className="space-y-8">
          <div className="group">
            <label className="block text-[11px] font-black uppercase text-indigo-900/60 mb-3 tracking-widest ml-1">PROJECT IDENTITY</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-slate-900 font-bold text-xl placeholder:text-slate-300"
              placeholder="e.g. Smart Logistics Phase 1"
            />
          </div>

          <div className="group">
            <label className="block text-[11px] font-black uppercase text-indigo-900/60 mb-3 tracking-widest ml-1 flex items-center gap-2">
              <FileText size={14} /> PROJECT DESCRIPTION
            </label>
            <textarea 
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-slate-800 font-medium text-base resize-none placeholder:text-slate-300 shadow-inner"
              placeholder="Provide a high-level summary of the project goals..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="group">
              <label className="block text-[11px] font-black uppercase text-indigo-900/60 mb-3 tracking-widest ml-1">LEADERSHIP</label>
              <select 
                required
                value={formData.leader}
                onChange={e => setFormData({ ...formData, leader: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 font-bold appearance-none cursor-pointer shadow-sm"
              >
                <option value="">Select Leader</option>
                {masterData.leaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="group">
              <label className="block text-[11px] font-black uppercase text-indigo-900/60 mb-3 tracking-widest ml-1">DEPARTMENT</label>
              <select 
                required
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 font-bold appearance-none cursor-pointer shadow-sm"
              >
                <option value="">Select Dept</option>
                {masterData.departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-[3rem] p-10 border border-indigo-100 flex flex-col justify-center shadow-inner relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-3xl opacity-50" />
          <div className="flex justify-between items-center mb-6 relative z-10">
            <label className="block text-[12px] font-black uppercase text-indigo-900/50 tracking-widest">MASTER DELIVERY PROGRESS</label>
            <span className="text-6xl font-black text-indigo-700 drop-shadow-sm">{formData.progress}%</span>
          </div>
          <div className="w-full h-6 bg-white/60 rounded-full overflow-hidden p-1 shadow-inner relative z-10">
             <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${formData.progress}%` }}
             />
          </div>
          <div className="flex items-start gap-3 mt-8 relative z-10">
            <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-indigo-900/60 italic font-medium leading-relaxed">
              Calculated automatically based on weighted task completion. Ensure all operational roadmap weights sum to exactly 100% for precise portfolio metrics.
            </p>
          </div>
          
          <div className="mt-8 relative z-10">
            <label className="block text-[11px] font-black uppercase text-indigo-900/60 mb-3 tracking-widest ml-1">PROJECT DEPLOYMENT STATUS</label>
            <select 
              required
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 font-black appearance-none cursor-pointer text-sm shadow-sm"
            >
              {masterData.statuses.map(s => <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Roadmap Section: Tasks - Updated to be Softer (bg-indigo-50 glass) */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-indigo-50/50 glass p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm">
          <div className="flex flex-col">
            <h4 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Activity className="text-indigo-600" size={24} />
              Operational Roadmap
            </h4>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-48 h-2 bg-indigo-100/50 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ${totalWeight === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                  style={{ width: `${Math.min(totalWeight, 100)}%` }} 
                />
              </div>
              <span className={`text-[12px] font-black ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalWeight}% TOTAL WEIGHTED
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleAddTask}
            className="flex items-center gap-3 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black text-sm shadow-xl hover:scale-105 active:scale-95"
          >
            <Plus size={18} /> APPEND TASK
          </button>
        </div>
        
        {/* Table Header (Visual Guide) */}
        {formData.tasks.length > 0 && (
          <div className="hidden lg:grid grid-cols-12 gap-6 px-8 mb-4">
            <div className="col-span-11 text-[11px] font-black text-slate-400 uppercase tracking-widest">Task Details & Scheduling</div>
            <div className="col-span-1"></div>
          </div>
        )}

        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 no-scrollbar pb-4">
          {formData.tasks.map((task) => (
            <div key={task.id} className="p-8 bg-slate-50/50 border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:bg-white transition-all group/card border-l-8 border-l-indigo-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Name & Description (WIDER) */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-900/40 uppercase mb-2 tracking-widest flex items-center gap-2">
                      <Target size={12} /> Task Identity
                    </label>
                    <input 
                      type="text" 
                      value={task.name}
                      onChange={e => updateTask(task.id, 'name', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-300"
                      placeholder="What needs to be done?"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-900/40 uppercase mb-2 tracking-widest flex items-center gap-2">
                      <AlignLeft size={12} /> Task Description
                    </label>
                    <textarea 
                      rows={2}
                      value={task.description}
                      onChange={e => updateTask(task.id, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-300 resize-none shadow-sm"
                      placeholder="Briefly explain the task requirements..."
                    />
                  </div>
                </div>

                {/* Right Column: Schedule, Weight, Progress */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Scheduling Block */}
                  <div className="space-y-4 bg-white/40 p-5 rounded-3xl border border-slate-100">
                     <div>
                        <label className="block text-[10px] font-black text-indigo-900/40 uppercase mb-2 tracking-widest">Start Schedule</label>
                        <input 
                          type="date" 
                          value={task.startDate}
                          onChange={e => updateTask(task.id, 'startDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-900 outline-none shadow-sm"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-indigo-900/40 uppercase mb-2 tracking-widest">End Deadline</label>
                        <input 
                          type="date" 
                          value={task.endDate}
                          onChange={e => updateTask(task.id, 'endDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-900 outline-none shadow-sm"
                        />
                     </div>
                  </div>

                  {/* Weight & Progress Block */}
                  <div className="space-y-5 bg-white/40 p-5 rounded-3xl border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-900/40 uppercase mb-2 tracking-widest">Weighting Factor (%)</label>
                      <input 
                        type="number" 
                        value={task.weight}
                        onChange={e => updateTask(task.id, 'weight', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-indigo-600 outline-none text-center shadow-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-black text-indigo-900/40 uppercase tracking-widest">Completion</label>
                        <span className="text-[11px] font-black text-indigo-600">{task.progress}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100"
                        value={task.progress}
                        onChange={e => updateTask(task.id, 'progress', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Remove Button */}
                <div className="lg:col-span-1 flex justify-center lg:pt-8">
                  <button 
                    type="button"
                    onClick={() => handleRemoveTask(task.id)}
                    className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-transparent hover:border-rose-100"
                    title="Remove Task"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end items-center gap-6 border-t border-slate-100 pt-10 mt-10">
        <button 
          type="button"
          onClick={onComplete}
          className="px-10 py-5 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase text-xs tracking-[0.2em]"
        >
          DISCARD CHANGES
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="px-16 py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50 text-base"
        >
          {loading ? 'SYNCING MATRIX...' : isEditMode ? 'COMMIT PROJECT UPDATES' : 'FINALIZE PROJECT DEPLOYMENT'}
          {!loading && <Save size={22} />}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
