
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

  // Sort history chronologically (oldest first)
  const sortedHistory = [...history].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  
  // Extract milestones from the latest state to plot on the timeline
  const latestMilestones = sortedHistory[sortedHistory.length - 1].milestones || [];

  // Determine the full time range to ensure both updates and milestones are visible
  const updateTimes = sortedHistory.map(h => new Date(h.updatedAt).getTime());
  const milestoneTimes = latestMilestones.map(m => new Date(m.date).getTime());
  
  const startTime = Math.min(...updateTimes, ...milestoneTimes);
  const endTime = Math.max(...updateTimes, ...milestoneTimes);
  const timeRange = Math.max(endTime - startTime, 1000 * 60 * 60 * 24 * 7); // Min 1 week range

  const width = 1000;
  const height = 340;
  const padding = { top: 60, right: 80, bottom: 60, left: 60 };

  const getX = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return padding.left + ((t - startTime) / timeRange) * (width - padding.left - padding.right);
  };

  const getY = (progress: number) => {
    return height - padding.bottom - (progress / 100) * (height - padding.top - padding.bottom);
  };

  // Generate Path Data for the progress line
  const points = sortedHistory.map(d => `${getX(d.updatedAt)},${getY(d.progress)}`).join(' ');
  const areaPoints = `${getX(sortedHistory[0].updatedAt)},${getY(0)} ${points} ${getX(sortedHistory[sortedHistory.length - 1].updatedAt)},${getY(0)}`;

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-white dark:border-slate-800 overflow-hidden">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Tactical Progression Map</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Historical velocity & milestone target analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-indigo-500 rounded-full" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Progress Trace</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm rotate-45" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pending Milestone</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm rotate-45" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Achieved</span>
           </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto no-scrollbar">
        <div className="min-w-[800px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Grid Lines */}
            {[0, 25, 50, 75, 100].map(p => (
              <g key={p}>
                <line 
                  x1={padding.left} y1={getY(p)} x2={width - padding.right} y2={getY(p)} 
                  className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="4 4"
                />
                <text x={padding.left - 15} y={getY(p) + 4} textAnchor="end" className="fill-slate-400 dark:fill-slate-600 text-[10px] font-black">{p}%</text>
              </g>
            ))}

            {/* Area Fill */}
            <polyline points={areaPoints} fill="url(#areaGradient)" />

            {/* Milestone Markers - Rendered below the line but with top labels */}
            {latestMilestones.map((m) => {
               const mX = getX(m.date);
               const isAchieved = !!m.completed;
               const colorClass = isAchieved ? 'fill-emerald-500' : 'fill-rose-500';
               const strokeClass = isAchieved ? 'stroke-emerald-400' : 'stroke-rose-400';
               
               return (
                 <g key={m.id} className="group/ms">
                    <line 
                      x1={mX} y1={padding.top - 20} x2={mX} y2={height - padding.bottom} 
                      className={`${strokeClass} opacity-20 group-hover/ms:opacity-60 transition-opacity`}
                      strokeWidth="1.5" strokeDasharray="3 3"
                    />
                    {/* Diamond Marker */}
                    <rect 
                      x={mX - 5} y={getY(0) - 5} width="10" height="10" 
                      className={`${colorClass} transition-transform group-hover/ms:scale-125 origin-center`}
                      transform={`rotate(45, ${mX}, ${getY(0)})`}
                    />
                    {/* Top Label */}
                    <text 
                      x={mX} y={padding.top - 35} textAnchor="middle" 
                      className={`${colorClass} text-[9px] font-black uppercase tracking-tighter opacity-0 group-hover/ms:opacity-100 transition-all duration-300 translate-y-2 group-hover/ms:translate-y-0`}
                    >
                      {m.name}
                    </text>
                    <text 
                      x={mX} y={padding.top - 25} textAnchor="middle" 
                      className="fill-slate-400 dark:fill-slate-500 text-[8px] font-bold opacity-0 group-hover/ms:opacity-100 transition-all"
                    >
                      {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                 </g>
               );
            })}

            {/* Main Progress Line */}
            <polyline 
              points={points} 
              fill="none" 
              stroke="#4f46e5" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              filter="url(#glow)"
              className="drop-shadow-lg"
            />

            {/* Data Nodes */}
            {sortedHistory.map((d) => (
              <g key={d.id} className="group/node">
                 <circle 
                  cx={getX(d.updatedAt)} cy={getY(d.progress)} r="6" 
                  className="fill-white dark:fill-indigo-400 stroke-indigo-600 dark:stroke-slate-900 cursor-pointer group-hover/node:r-8 transition-all"
                  strokeWidth="3"
                 />
                 <rect 
                   x={getX(d.updatedAt) - 20} y={getY(d.progress) - 30} width="40" height="18" rx="4"
                   className="fill-slate-900 dark:fill-indigo-500 opacity-0 group-hover/node:opacity-100 transition-all"
                 />
                 <text 
                   x={getX(d.updatedAt)} y={getY(d.progress) - 18} textAnchor="middle" 
                   className="fill-white text-[10px] font-black opacity-0 group-hover/node:opacity-100 transition-all"
                 >
                   {d.progress}%
                 </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="flex justify-between mt-6 px-[60px] border-t border-slate-50 dark:border-slate-800 pt-6">
        <div className="flex flex-col items-start">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-1">Timeline Start</span>
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{new Date(startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-1">Timeline End</span>
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{new Date(endTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
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
            if (typeof docData.updatedAt.toDate === 'function') {
              updatedStr = docData.updatedAt.toDate().toISOString();
            } else if (docData.updatedAt instanceof Date) {
              updatedStr = docData.updatedAt.toISOString();
            } else if (typeof docData.updatedAt === 'string') {
              updatedStr = docData.updatedAt;
            }
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
            tasks: (docData.tasks || []).map((t: any) => ({
              id: String(t.id),
              name: String(t.name),
              description: String(t.description || ''),
              startDate: String(t.startDate),
              endDate: String(t.endDate),
              progress: Number(t.progress || 0),
              weight: Number(t.weight || 0)
            })) as Task[],
            milestones: (docData.milestones || []).map((m: any) => ({
              id: String(m.id),
              name: String(m.name),
              description: String(m.description || ''),
              date: String(m.date),
              completed: !!m.completed
            })) as Milestone[]
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
    <div className="space-y-8 pb-12">
      {/* Top Controls Header */}
      <div className="bg-white/80 dark:bg-slate-900/60 glass rounded-[2.5rem] p-6 shadow-xl border border-white/50 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
              <History size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">Strategic Analysis</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.25em] mt-2 flex items-center gap-2">
                <Target size={12} /> Portfolio Drift Intelligence
              </p>
            </div>
          </div>
          
          <div className="w-full lg:w-96 flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-2 shadow-inner group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-widest mr-3">Node:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-grow bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer py-1.5"
            >
              {projects.map(p => <option key={p.id} value={p.id} className="dark:bg-slate-800">{p.name}</option>)}
            </select>
            <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/40 dark:bg-slate-900/40 glass rounded-[3rem] animate-pulse">
          <div className="w-16 h-16 border-4 border-indigo-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-6" />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em]">Decoding Snapshot Matrix...</p>
        </div>
      ) : (
        <>
          {/* Progression Map Chart Section */}
          {history.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
               <ProgressionChart history={history} />
            </div>
          )}

          {/* Iteration Snapshot List */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-4">
               <CalendarDays size={18} className="text-slate-400" />
               <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em]">Iteration Ledger</h3>
            </div>

            <div className="space-y-4">
              {history.length > 0 ? history.map((snapshot, idx) => {
                const previous = history[idx + 1];
                const delta = previous ? snapshot.progress - previous.progress : 0;
                const date = new Date(snapshot.updatedAt);
                const isExpanded = expandedSnapshotId === snapshot.id;

                return (
                  <div 
                    key={snapshot.id} 
                    className={`group bg-white/80 dark:bg-slate-900/60 glass rounded-[2.5rem] border transition-all duration-300 ${
                      isExpanded ? 'border-indigo-200 dark:border-indigo-500 shadow-2xl p-8 ring-8 ring-indigo-500/5 dark:ring-indigo-500/10' : 'border-white dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-700 shadow-lg p-6'
                    }`}
                  >
                    <div 
                      className="flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer"
                      onClick={() => setExpandedSnapshotId(isExpanded ? null : snapshot.id)}
                    >
                      <div className="flex items-center gap-8">
                        <div className={`w-16 h-16 rounded-3xl flex flex-col items-center justify-center transition-all shadow-lg ${isExpanded ? 'bg-indigo-600 dark:bg-indigo-500 text-white scale-110' : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700'}`}>
                          <span className={`text-[10px] font-black uppercase mb-1 ${isExpanded ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-2xl font-black leading-none tracking-tighter">{date.getDate()}</span>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-[0.25em] mb-2">Alpha State Node</div>
                          <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <span className="uppercase text-slate-500 dark:text-slate-400 tracking-wider font-bold">{snapshot.status}</span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-16 flex-grow justify-end">
                        <div className="text-right">
                          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Baseline Progress</div>
                          <div className="text-4xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{snapshot.progress}%</div>
                        </div>
                        
                        {previous && (
                          <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-3xl transition-all shadow-inner ${
                            delta > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/30' : 
                            delta < 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 ring-1 ring-rose-100 dark:ring-rose-800/30' : 
                            'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-1 ring-slate-100 dark:ring-slate-700'
                          }`}>
                            <div className="text-[8px] font-black uppercase mb-1 tracking-widest">Variance</div>
                            <div className="flex items-center gap-1 text-xl font-black leading-none">
                              {delta > 0 ? <ArrowUpRight size={18} /> : delta < 0 ? <ArrowDownRight size={18} /> : <Minus size={18} />}
                              {Math.abs(delta)}%
                            </div>
                          </div>
                        )}
                        
                        <div className="hidden xl:block">
                          <div className={`p-2 rounded-full transition-all ${isExpanded ? 'bg-indigo-600 dark:bg-indigo-500 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:scale-110'}`}>
                            <ChevronDown size={20} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && renderComparison(snapshot, previous)}
                  </div>
                );
              }) : (
                <div className="bg-white/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-32 text-center flex flex-col items-center gap-8 shadow-inner">
                  <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 dark:text-slate-700 shadow-inner">
                    <AlertCircle size={56} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Zero Historical Entropy</p>
                    <p className="text-sm text-slate-300 dark:text-slate-500 font-bold mt-3">Initial deployments pending. Update project parameters to begin chronological mapping.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VarianceUI;
