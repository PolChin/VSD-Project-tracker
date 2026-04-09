import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, where, getDocs, doc, setDoc, updateDoc } from '../firebase';
import { Project, WeeklyUpdate, MasterData } from '../types';
import { X, Save, Clock, AlertCircle, CheckCircle2, FileText, Calendar } from 'lucide-react';
import { getCurrentWeekId, getPreviousWeekId, getNextWeekId, weekIdToDateRange } from '../utils/dateUtils';

interface ProgressUpdateModalProps {
  project: Project;
  initialWeekId?: string;
  masterData: MasterData;
  onClose: () => void;
  onSuccess?: () => void;
}

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({ project, initialWeekId, masterData, onClose, onSuccess }) => {
  const [history, setHistory] = useState<WeeklyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const latestWeekId = getCurrentWeekId();
  const [selectedWeekId, setSelectedWeekId] = useState<string>(initialWeekId || latestWeekId);
  const [form, setForm] = useState({
    progress: project.progress,
    status: project.status,
    summary: '',
    issues: '',
    nextSteps: ''
  });

  // Fetch all history for this project (no orderBy to avoid needing composite index)
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'weekly_updates'),
          where('projectId', '==', project.id)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as WeeklyUpdate));
        // Sort client-side by updatedAt descending
        data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [project.id]);

  // Build a quick lookup map: weekId -> most recent update for that week
  const updatesByWeek = useMemo(() => {
    const map: Record<string, WeeklyUpdate> = {};
    // history is already sorted descending, so first entry for each week = most recent
    history.forEach(item => {
      if (!map[item.weekId]) {
        map[item.weekId] = item;
      }
    });
    return map;
  }, [history]);

  // When user selects a different week, auto-populate form with existing data if available
  useEffect(() => {
    const existing = updatesByWeek[selectedWeekId];
    if (existing) {
      setForm({
        progress: existing.progress,
        status: existing.status,
        summary: existing.summary || '',
        issues: existing.issues || '',
        nextSteps: existing.nextSteps || ''
      });
    } else {
      // No existing data: reset text fields, keep progress & status from project
      setForm({
        progress: project.progress,
        status: project.status,
        summary: '',
        issues: '',
        nextSteps: ''
      });
    }
  }, [selectedWeekId, updatesByWeek]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const HH = String(now.getHours()).padStart(2, '0');
      const MM = String(now.getMinutes()).padStart(2, '0');

      const projectCode = (project.projectId || project.id).replace(/\s+/g, '_');
      const docId = `${projectCode}_PU_${yyyy}${mm}${dd}_${HH}${MM}`;

      const weekId = selectedWeekId;

      const updateData: WeeklyUpdate = {
        id: docId,
        projectId: project.id,
        weekId,
        progress: form.progress,
        status: form.status,
        summary: form.summary,
        issues: form.issues,
        nextSteps: form.nextSteps,
        updatedAt: now.toISOString()
      };

      // Save the weekly update record
      await setDoc(doc(db, 'weekly_updates', docId), updateData);

      // Always update project progress & status directly
      await updateDoc(doc(db, 'projects', project.id), {
        progress: form.progress,
        status: form.status,
        updatedAt: now
      });

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Failed to save progress:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = () => {
    if (window.confirm("You have unsaved changes. Are you sure you want to close this window?\n\n(Click OK to exit without saving, or Cancel to continue editing.)")) {
      onClose();
    }
  };

  const existingDataForWeek = updatesByWeek[selectedWeekId];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md transition-opacity" onClick={handleBackdropClick} />
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 max-h-[90vh]">
        
        {/* Left Side: Form */}
        <div className="w-full md:w-1/2 p-8 flex flex-col bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 h-[80vh] md:h-[90vh]">
          <div className="flex justify-between items-start mb-6 flex-shrink-0">
            <div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Update Progress</h3>
               <p className="text-[11px] uppercase font-black tracking-widest text-slate-500 mt-1">{project.name}</p>
            </div>
            <button onClick={onClose} className="md:hidden p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-5">
            {/* Overall Progress */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Overall Progress</label>
              <div className="flex items-center gap-4 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value)})} className="w-full accent-indigo-600" />
                <span className="text-lg font-black text-slate-800 dark:text-slate-200 min-w-[3rem] text-right">{form.progress}%</span>
              </div>
            </div>

            {/* Target Week + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Week</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedWeekId}
                    onChange={e => setSelectedWeekId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none"
                  >
                    {/* Future weeks */}
                    {[2, 1].map(offset => {
                      let w = getCurrentWeekId();
                      for(let i=0; i<offset; i++) w = getNextWeekId(w);
                      return <option key={w} value={w}>{w} (Future)</option>;
                    })}
                    {/* Past 7 weeks */}
                    {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                      let w = getCurrentWeekId();
                      for(let i=0; i<offset; i++) w = getPreviousWeekId(w);
                      const { start, end } = weekIdToDateRange(w);
                      const rangeStr = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric'})} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}`;
                      const isLatest = w === latestWeekId;
                      const hasData = !!updatesByWeek[w];
                      return (
                        <option key={w} value={w}>
                          {w}{isLatest ? ' ★ Latest' : ''}{hasData ? ' ●' : ''} ({rangeStr})
                        </option>
                      );
                    })}
                  </select>
                </div>
                {/* Indicator if this week has existing data */}
                {existingDataForWeek && (
                  <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                    Loaded existing update
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                  {masterData.statuses.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"><FileText size={12}/> Executive Summary</label>
              <textarea value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} placeholder="Key achievements and overall progress..." className="w-full h-24 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"></textarea>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2"><AlertCircle size={12}/> Blockers / Issues</label>
              <textarea value={form.issues} onChange={e => setForm({...form, issues: e.target.value})} placeholder="Bottlenecks or risks..." className="w-full h-20 px-6 py-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none shadow-sm"></textarea>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2"><CheckCircle2 size={12}/> Next Steps</label>
              <textarea value={form.nextSteps} onChange={e => setForm({...form, nextSteps: e.target.value})} placeholder="Action plan for next week..." className="w-full h-20 px-6 py-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-sm"></textarea>
            </div>
           
            <button type="submit" disabled={isSaving} className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50">
              <Save size={18} /> {isSaving ? 'Saving...' : existingDataForWeek ? 'Save Updated Record' : 'Post Weekly Update'}
            </button>
          </form>
        </div>

        {/* Right Side: History */}
        <div className="hidden md:flex w-full md:w-1/2 p-0 flex-col bg-white dark:bg-slate-900 h-[90vh]">
          <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 flex justify-between items-start">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2"><Clock size={16} /> Update History</h3>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                {loading ? 'Loading...' : `${Object.keys(updatesByWeek).length} week${Object.keys(updatesByWeek).length !== 1 ? 's' : ''} recorded`}
              </p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto custom-scrollbar p-8 space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                 <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                <Clock size={48} className="mb-4" />
                <span className="text-xs font-black uppercase tracking-widest">No previous updates recorded</span>
                <span className="text-[9px] font-bold mt-2 text-center">Updates will appear here after you post your first weekly update.</span>
              </div>
            ) : (
              (Object.values(updatesByWeek) as WeeklyUpdate[])
                .sort((a, b) => b.weekId.localeCompare(a.weekId))
                .map(item => {
                const date = new Date(item.updatedAt);
                const statusColor = masterData.statuses.find(s => s.name === item.status)?.color || '#94a3b8';
                const isSelected = item.weekId === selectedWeekId;
                return (
                  <div
                    key={item.id}
                    className={`relative pl-6 pb-6 border-l-2 last:border-0 last:pb-0 group cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-400 dark:border-indigo-500'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                    onClick={() => setSelectedWeekId(item.weekId)}
                    title="Click to load this update"
                  >
                    <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full transition-colors ${
                      isSelected ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-400'
                    }`} />
                    
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                          {item.weekId}
                          {isSelected && <span className="ml-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[8px]">LOADED</span>}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'})} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">{item.progress}%</span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-black text-white uppercase" style={{ backgroundColor: statusColor }}>{item.status}</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 shadow-sm">
                      {item.summary && <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed"><FileText size={10} className="inline mr-1 opacity-50"/> {item.summary}</div>}
                      {(item.issues || item.nextSteps) && <div className="grid grid-cols-1 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/50">
                        {item.issues && <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium"><AlertCircle size={10} className="inline mr-1 mb-0.5 text-rose-500"/> {item.issues}</div>}
                        {item.nextSteps && <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium"><CheckCircle2 size={10} className="inline mr-1 mb-0.5 text-emerald-500"/> {item.nextSteps}</div>}
                      </div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProgressUpdateModal;
