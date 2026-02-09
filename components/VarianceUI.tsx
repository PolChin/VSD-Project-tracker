
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
  Activity, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Target,
  BarChart3,
  CalendarDays
} from 'lucide-react';

interface VarianceUIProps {
  projects: Project[];
}

const ProgressionChart: React.FC<{ history: ProjectHistory[] }> = ({ history }) => {
  if (history.length < 1) return null;

  const sortedHistory = [...history].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  const latestMilestones = sortedHistory[sortedHistory.length - 1].milestones || [];

  const updateTimes = sortedHistory.map(h => new Date(h.updatedAt).getTime());
  const milestoneTimes = latestMilestones.map(m => new Date(m.date).getTime());
  
  const startTime = Math.min(...updateTimes, ...milestoneTimes);
  const endTime = Math.max(...updateTimes, ...milestoneTimes);
  const timeRange = Math.max(endTime - startTime, 1000 * 60 * 60 * 24 * 7);

  // SVG Dimension Constants
  const width = 1000;
  const height = 500; 
  // Increased padding to prevent clipping of labels and markers
  const padding = { top: 50, right: 60, bottom: 80, left: 80 };

  const getX = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return padding.left + ((t - startTime) / timeRange) * (width - padding.left - padding.right);
  };

  const getY = (progress: number) => {
    return height - padding.bottom - (progress / 100) * (height - padding.top - padding.bottom);
  };

  const points = sortedHistory.map(d => `${getX(d.updatedAt)},${getY(d.progress)}`).join(' ');
  const areaPoints = `${getX(sortedHistory[0].updatedAt)},${getY(0)} ${points} ${getX(sortedHistory[sortedHistory.length - 1].updatedAt)},${getY(0)}`;

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-white dark:border-slate-800 overflow-hidden h-[600px] flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Tactical Progression Map</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1">Historical velocity & Operational Momentum</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
           <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-indigo-500 rounded-full" />
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Progress</span>
           </div>
           <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm rotate-45" />
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Achieved</span>
           </div>
        </div>
      </div>

      <div className="relative w-full flex-grow min-h-0 overflow-hidden bg-slate-50/30 dark:bg-slate-800/10 rounded-3xl">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full" 
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid Lines & Labels */}
          {[0, 25, 50, 75, 100].map(p => (
            <g key={p}>
              <line 
                x1={padding.left} y1={getY(p)} x2={width - padding.right} y2={getY(p)} 
                className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="4 4"
              />
              <text 
                x={padding.left - 15} 
                y={getY(p) + 4} 
                textAnchor="end" 
                className="fill-slate-400 dark:fill-slate-500 text-[12px] font-black"
              >
                {p}%
              </text>
            </g>
          ))}

          {/* Area Fill */}
          <polyline points={areaPoints} fill="url(#areaGradient)" />

          {/* Milestone Indicators */}
          {latestMilestones.map((m) => {
             const mX = getX(m.date);
             const isAchieved = !!m.completed;
             const colorClass = isAchieved ? 'fill-emerald-500' : 'fill-rose-500';
             return (
               <g key={m.id} className="group/ms">
                  <line x1={mX} y1={padding.top} x2={mX} y2={height - padding.bottom} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="2 2" />
                  <rect 
                    x={mX - 6} 
                    y={getY(0) - 6} 
                    width="12" 
                    height="12" 
                    className={`${colorClass} transition-transform group-hover/ms:scale-150 origin-center cursor-help shadow-sm`} 
                    transform={`rotate(45, ${mX}, ${getY(0)})`} 
                  />
               </g>
             );
          })}

          {/* Main Progress Line */}
          <polyline 
            points={points} 
            fill="none" 
            stroke="#4f46e5" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="drop-shadow-lg" 
          />

          {/* Progress Nodes */}
          {sortedHistory.map((d) => (
            <g key={d.id} className="group/pt cursor-pointer">
              <circle 
                cx={getX(d.updatedAt)} 
                cy={getY(d.progress)} 
                r="7" 
                className="fill-white dark:fill-indigo-400 stroke-indigo-600 dark:stroke-slate-900 transition-all group-hover/pt:r-9" 
                strokeWidth="4" 
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Inception</span>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{new Date(startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Projection Limit</span>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{new Date(endTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
        </div>
      </div>
    </div>
  );
};

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
          let updatedStr = new Date().toISOString();
          if (docData.updatedAt) {
            if (typeof docData.updatedAt.toDate === 'function') updatedStr = docData.updatedAt.toDate().toISOString();
            else if (docData.updatedAt instanceof Date) updatedStr = docData.updatedAt.toISOString();
            else if (typeof docData.updatedAt === 'string') updatedStr = docData.updatedAt;
          }
          return { 
            id: d.id,
            projectId: String(docData.projectId || ''),
            name: String(docData.name || 'Untitled'),
            leader: String(docData.leader || 'N/A'),
            department: String(docData.department || 'N/A'),
            status: String(docData.status || 'Unknown'),
            progress: Number(docData.progress || 0),
            updatedAt: updatedStr,
            description: String(docData.description || ''),
            tasks: (docData.tasks || []).map((t: any) => ({ ...t })),
            milestones: (docData.milestones || []).map((m: any) => ({ ...m }))
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
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center mt-4">
        <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Initial Deployment Node</p>
      </div>
    );

    const taskChanges = current.tasks.map(task => {
      const prevTask = previous.tasks.find(t => t.id === task.id);
      return {
        id: task.id,
        name: task.name,
        progressDelta: prevTask ? task.progress - prevTask.progress : 0,
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
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <Activity size={10} className="text-indigo-500" />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Operational Drift</span>
          </div>
          {taskChanges.slice(0, 3).map(change => (
            <div key={change.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate flex-grow mr-2">{change.name}</span>
              <div className={`text-[10px] font-black ${change.progressDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {change.progressDelta > 0 ? '+' : ''}{change.progressDelta}%
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <Target size={10} className="text-rose-500" />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Temporal Slippage</span>
          </div>
          {milestoneChanges.slice(0, 3).map(change => (
            <div key={change.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate flex-grow mr-2">{change.name}</span>
              <div className={`text-[9px] font-black ${change.dateSlip > 0 ? 'text-rose-500' : change.dateSlip < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                {change.dateSlip === 0 ? 'FIXED' : `${Math.abs(change.dateSlip)}d`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-[19px]">
      <div className="bg-white/80 dark:bg-slate-900/60 glass rounded-2xl p-4 shadow-sm border border-white/50 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl shadow-md">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">Strategic Analysis</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Portfolio Drift Intelligence</p>
            </div>
          </div>
          <div className="w-full sm:w-80 flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-1.5 shadow-inner">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mr-2">Node:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-grow bg-transparent border-none text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer"
            >
              {projects.map(p => <option key={p.id} value={p.id} className="dark:bg-slate-800">{p.name}</option>)}
            </select>
            <ChevronDown size={12} className="text-slate-400 ml-2" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Decoding Snapshot Matrix...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full max-w-full lg:h-[600px] mb-8">
          <div className="lg:col-span-7 flex flex-col h-full min-h-[600px]">
            {history.length > 0 ? (
              <ProgressionChart history={history} />
            ) : (
              <div className="h-[600px] bg-white/80 dark:bg-slate-900/60 glass rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center p-20 text-center">
                 <div className="opacity-30">
                   <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
                   <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Zero Historical Entropy</p>
                 </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col h-full min-h-[600px] overflow-hidden">
            <div className="bg-white/80 dark:bg-slate-900/60 glass rounded-[2.5rem] border border-white dark:border-slate-800 shadow-xl flex flex-col h-[600px] overflow-hidden">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-inherit z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-tighter">Snapshot Ledger</h3>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Historical Iteration log</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-black text-slate-500 tracking-wider">{history.length} ITEMS</span>
              </div>

              <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-4">
                {history.map((snapshot, idx) => {
                  const previous = history[idx + 1];
                  const delta = previous ? snapshot.progress - previous.progress : 0;
                  const date = new Date(snapshot.updatedAt);
                  const isExpanded = expandedSnapshotId === snapshot.id;

                  return (
                    <div 
                      key={snapshot.id} 
                      className={`group rounded-[1.5rem] border transition-all duration-300 ${
                        isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/50 p-6 shadow-lg' : 'bg-slate-50 dark:bg-slate-800/40 border-transparent hover:border-slate-200 dark:hover:border-slate-700 p-4'
                      }`}
                    >
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedSnapshotId(isExpanded ? null : snapshot.id)}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${isExpanded ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            <span className="text-[8px] uppercase leading-none mb-0.5">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                            <span className="text-[15px] leading-none">{date.getDate()}</span>
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{snapshot.status}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-800 dark:text-white leading-none">{snapshot.progress}%</div>
                            {previous && (
                              <div className={`text-[9px] font-black flex items-center gap-0.5 justify-end mt-1 ${delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                {delta > 0 ? <ArrowUpRight size={10} /> : delta < 0 ? <ArrowDownRight size={10} /> : null}
                                {Math.abs(delta)}%
                              </div>
                            )}
                          </div>
                          <ChevronRight size={18} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500' : ''}`} />
                        </div>
                      </div>
                      {isExpanded && renderComparison(snapshot, previous)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VarianceUI;
