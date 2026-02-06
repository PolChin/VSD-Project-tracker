
import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, where, orderBy, getDocs } from '../firebase';
import { Project, ProjectHistory, Task, Milestone } from '../types';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Target
} from 'lucide-react';

interface VarianceUIProps {
  projects: Project[];
}

const VarianceUI: React.FC<VarianceUIProps> = ({ projects }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [history, setHistory] = useState<ProjectHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'projects_history'), 
          where('projectId', '==', selectedProjectId),
          orderBy('updatedAt', 'desc')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => {
          const docData = d.data({ serverTimestamps: 'estimate' });
          
          // Sanitize updatedAt to ISO string
          let updatedStr = new Date().toISOString();
          if (docData.updatedAt) {
            if (typeof docData.updatedAt.toDate === 'function') {
              updatedStr = docData.updatedAt.toDate().toISOString();
            } else if (docData.updatedAt instanceof Date) {
              updatedStr = docData.updatedAt.toISOString();
            } else if (typeof docData.updatedAt === 'string') {
              updatedStr = docData.updatedAt;
            }
          }

          return { 
            ...docData,
            id: d.id, 
            updatedAt: updatedStr
          };
        }) as ProjectHistory[];
        
        setHistory(data);
        if (data.length > 0) setExpandedSnapshotId(data[0].id);
      } catch (err: any) {
        console.error("History fetch failed:", err?.message || "Internal Error");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedProjectId]);

  const calculateDateDiff = (d1: string, d2: string) => {
    const diffTime = new Date(d1).getTime() - new Date(d2).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderComparison = (current: ProjectHistory, previous?: ProjectHistory) => {
    if (!previous) return (
      <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Initial Deployment Node — No Baseline for Comparison</p>
      </div>
    );

    const progressDelta = current.progress - previous.progress;
    
    const taskChanges = current.tasks.map(task => {
      const prevTask = previous.tasks.find(t => t.id === task.id);
      return {
        id: task.id,
        name: task.name,
        progressDelta: prevTask ? task.progress - prevTask.progress : 0,
        startSlip: prevTask ? calculateDateDiff(task.startDate, prevTask.startDate) : 0,
        endSlip: prevTask ? calculateDateDiff(task.endDate, prevTask.endDate) : 0,
        isNew: !prevTask
      };
    });

    const milestoneChanges = (current.milestones || []).map(m => {
      const prevM = (previous.milestones || []).find(pm => pm.id === m.id);
      return {
        id: m.id,
        name: m.name,
        dateSlip: prevM ? calculateDateDiff(m.date, prevM.date) : 0,
        isNew: !prevM
      };
    });

    return (
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Operational Drift (Tasks)</h4>
          </div>
          <div className="space-y-3">
            {taskChanges.map(change => (
              <div key={change.id} className="group/task flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all">
                <div className="flex flex-col min-w-0 flex-grow pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{change.name}</span>
                    {change.isNew && <span className="text-[7px] font-black text-white bg-indigo-500 px-1 rounded uppercase">New</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-slate-400 dark:text-slate-500" />
                      <span className={`text-[9px] font-bold ${change.endSlip > 0 ? 'text-rose-500' : change.endSlip < 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                        {change.endSlip > 0 ? `+${change.endSlip}d delay` : change.endSlip < 0 ? `${change.endSlip}d earlier` : 'On schedule'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className={`flex flex-col items-end ${change.progressDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : change.progressDelta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    <span className="text-[8px] font-black uppercase tracking-tighter">Delta</span>
                    <div className="flex items-center gap-0.5 font-black text-sm">
                      {change.progressDelta > 0 ? '+' : ''}{change.progressDelta}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-rose-600 dark:text-rose-400" />
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Temporal Slippage (Milestones)</h4>
          </div>
          <div className="space-y-3">
            {milestoneChanges.length > 0 ? milestoneChanges.map(change => (
              <div key={change.id} className="flex items-center justify-between p-3 bg-rose-50/30 dark:bg-rose-900/10 rounded-xl border border-transparent border-l-2 border-l-rose-300 dark:border-l-rose-500">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{change.name}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Strategic Milestone</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg font-black text-[10px] ${
                  change.dateSlip > 0 ? 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300' : 
                  change.dateSlip < 0 ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300' : 
                  'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {change.dateSlip === 0 ? 'NO CHANGE' : `${Math.abs(change.dateSlip)}d ${change.dateSlip > 0 ? 'SLIPPED' : 'AHEAD'}`}
                  {change.dateSlip > 0 ? <AlertTriangle size={12} /> : change.dateSlip < 0 ? <TrendingUp size={12} /> : <CheckCircle2 size={12} />}
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-300 dark:text-slate-700 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                No milestone tracking active
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-slate-900/60 glass rounded-3xl p-5 shadow-xl border border-white/50 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none">Analysis Scan</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1.5">Temporal Delta Intelligence Engine</p>
            </div>
          </div>
          
          <div className="w-full lg:w-96 flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-1.5 shadow-inner">
            <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-widest mr-3">Active Unit:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-grow bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer py-2"
            >
              {projects.map(p => <option key={p.id} value={p.id} className="dark:bg-slate-800">{p.name}</option>)}
            </select>
            <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-slate-900/40 glass rounded-3xl animate-pulse">
          <div className="w-12 h-12 border-4 border-indigo-200 dark:border-slate-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4" />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Compiling Snapshot Deltas...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.length > 0 ? history.map((snapshot, idx) => {
            const previous = history[idx + 1];
            const delta = previous ? snapshot.progress - previous.progress : 0;
            const date = new Date(snapshot.updatedAt);
            const isExpanded = expandedSnapshotId === snapshot.id;

            return (
              <div 
                key={snapshot.id} 
                className={`group bg-white/80 dark:bg-slate-900/60 glass rounded-3xl border transition-all duration-300 ${
                  isExpanded ? 'border-indigo-200 dark:border-indigo-500 shadow-2xl p-6 ring-4 ring-indigo-500/5 dark:ring-indigo-500/10' : 'border-white dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-700 shadow-lg p-5'
                }`}
              >
                <div 
                  className="flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer"
                  onClick={() => setExpandedSnapshotId(isExpanded ? null : snapshot.id)}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700'}`}>
                      <span className={`text-[9px] font-black uppercase ${isExpanded ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-2xl font-black leading-none">{date.getDate()}</span>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1">Iteration Node</div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="uppercase text-slate-500 dark:text-slate-400 tracking-wider">{snapshot.status}</span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-12 flex-grow justify-end">
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Snapshot Alpha</div>
                      <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">{snapshot.progress}%</div>
                    </div>
                    
                    {previous && (
                      <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-3xl transition-all ${
                        delta > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/30' : 
                        delta < 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 ring-1 ring-rose-100 dark:ring-rose-800/30' : 
                        'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-1 ring-slate-100 dark:ring-slate-700'
                      }`}>
                        <div className="text-[8px] font-black uppercase mb-1 tracking-tighter">Variance</div>
                        <div className="flex items-center gap-1 text-xl font-black leading-none">
                          {delta > 0 ? <ArrowUpRight size={18} /> : delta < 0 ? <ArrowDownRight size={18} /> : <Minus size={18} />}
                          {Math.abs(delta)}%
                        </div>
                      </div>
                    )}
                    
                    <div className="hidden xl:block">
                      {isExpanded ? <ChevronDown className="text-indigo-600 dark:text-indigo-400" /> : <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />}
                    </div>
                  </div>
                </div>

                {isExpanded && renderComparison(snapshot, previous)}
              </div>
            );
          }) : (
            <div className="bg-white/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-24 text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 dark:text-slate-700">
                <AlertCircle size={48} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No Temporal History Detected</p>
                <p className="text-xs text-slate-300 dark:text-slate-500 font-bold mt-2">Deploy and update project status to generate variance snapshots.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VarianceUI;
