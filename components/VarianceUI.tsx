
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
  CalendarDays,
  Search
} from 'lucide-react';

interface VarianceUIProps {
  projects: Project[];
}

const ProgressionChart: React.FC<{ history: ProjectHistory[] }> = ({ history }) => {
  if (history.length < 1) return null;

  // --- Weekly aggregation: keep only the latest entry per ISO week ---
  const getISOWeekKey = (dateStr: string) => {
    const d = new Date(dateStr);
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  };

  const weekMap = new Map<string, ProjectHistory>();
  [...history].forEach(h => {
    const key = getISOWeekKey(h.updatedAt);
    const existing = weekMap.get(key);
    if (!existing || new Date(h.updatedAt) > new Date(existing.updatedAt)) {
      weekMap.set(key, h);
    }
  });

  const sortedHistory = Array.from(weekMap.values()).sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );
  // ---------------------------------------------------------------

  const latestMilestones = sortedHistory[sortedHistory.length - 1].milestones || [];

  const updateTimes = sortedHistory.map(h => new Date(h.updatedAt).getTime());
  const milestoneTimes = latestMilestones.map(m => new Date(m.date).getTime());

  const startTime = Math.min(...updateTimes, ...milestoneTimes);
  const endTime = Math.max(...updateTimes, ...milestoneTimes);
  const timeRange = Math.max(endTime - startTime, 1000 * 60 * 60 * 24 * 7);

  // SVG Dimension Constants
  const width = 1000;
  const height = 500;
  const padding = { top: 50, right: 60, bottom: 120, left: 80 };

  const getX = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return padding.left + ((t - startTime) / timeRange) * (width - padding.left - padding.right);
  };

  const getY = (progress: number) => {
    return height - padding.bottom - (progress / 100) * (height - padding.top - padding.bottom);
  };

  // --- X-axis ticks: up to 6 evenly-spaced date labels ---
  const xAxisTicks = (() => {
    const maxTicks = Math.min(sortedHistory.length, 6);
    if (maxTicks === 0) return [];
    const step = Math.max(1, Math.floor((sortedHistory.length - 1) / (maxTicks - 1)));
    const ticks: ProjectHistory[] = [];
    for (let i = 0; i < sortedHistory.length; i += step) ticks.push(sortedHistory[i]);
    if (ticks[ticks.length - 1] !== sortedHistory[sortedHistory.length - 1])
      ticks.push(sortedHistory[sortedHistory.length - 1]);
    return ticks;
  })();

  const points = sortedHistory.map(d => `${getX(d.updatedAt)},${getY(d.progress)}`).join(' ');
  const areaPoints = `${getX(sortedHistory[0].updatedAt)},${getY(0)} ${points} ${getX(sortedHistory[sortedHistory.length - 1].updatedAt)},${getY(0)}`;

  // --- Tooltip state ---
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);

  const showTooltip = (svgX: number, svgY: number, lines: string[]) => {
    setTooltip({ x: (svgX / width) * 100, y: (svgY / height) * 100, lines });
  };
  const hideTooltip = () => setTooltip(null);

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-white dark:border-slate-800 overflow-hidden h-[600px] flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Tactical Progression Map</h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1">Historical velocity &amp; Operational Momentum</p>
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
        {/* Floating Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 bg-slate-900/90 dark:bg-slate-700/90 text-white rounded-xl px-3 py-2 shadow-2xl border border-slate-700 dark:border-slate-600 backdrop-blur-sm"
            style={{
              left: `${Math.min(tooltip.x, 75)}%`,
              top: `${Math.max(tooltip.y - 14, 2)}%`,
              transform: 'translate(8px, -50%)',
              minWidth: 140,
            }}
          >
            {tooltip.lines.map((line, i) => (
              <p key={i} className={`text-[10px] font-bold leading-relaxed ${i === 0 ? 'text-indigo-300' : 'text-slate-200'}`}>{line}</p>
            ))}
          </div>
        )}

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

          {/* Grid Lines & Y Labels */}
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

          {/* X-Axis baseline */}
          <line
            x1={padding.left} y1={getY(0)}
            x2={width - padding.right} y2={getY(0)}
            className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5"
          />

          {/* X-Axis tick labels — rotated -65° */}
          {xAxisTicks.map((d, i) => {
            const x = getX(d.updatedAt);
            const yBase = getY(0);
            const date = new Date(d.updatedAt);
            const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            return (
              <g key={`xtick-${i}`}>
                <line x1={x} y1={yBase} x2={x} y2={yBase + 8} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
                <text
                  x={x}
                  y={yBase + 14}
                  textAnchor="end"
                  transform={`rotate(-65, ${x}, ${yBase + 14})`}
                  className="fill-slate-400 dark:fill-slate-500"
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <polyline points={areaPoints} fill="url(#areaGradient)" />

          {/* Milestone Indicators */}
          {latestMilestones.map((m) => {
            const mX = getX(m.date);
            const isAchieved = !!m.completed;
            const fillColor = isAchieved ? '#10b981' : '#f43f5e';
            const mDate = new Date(m.date).toLocaleDateString(undefined, { dateStyle: 'medium' });
            return (
              <g
                key={m.id}
                className="cursor-pointer"
                onMouseEnter={() => showTooltip(mX, getY(50), [
                  m.name,
                  `📅 ${mDate}`,
                  isAchieved ? '✅ Achieved' : '⏳ Pending',
                ])}
                onMouseLeave={hideTooltip}
              >
                <line x1={mX} y1={padding.top} x2={mX} y2={height - padding.bottom} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="2 2" />
                {/* Larger invisible hit area */}
                <rect x={mX - 14} y={getY(0) - 14} width="28" height="28" fill="transparent" />
                <rect
                  x={mX - 7}
                  y={getY(0) - 7}
                  width="14"
                  height="14"
                  fill={fillColor}
                  transform={`rotate(45, ${mX}, ${getY(0)})`}
                  style={{ transition: 'transform 0.2s' }}
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
          {sortedHistory.map((d) => {
            const cx = getX(d.updatedAt);
            const cy = getY(d.progress);
            const dateStr = new Date(d.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' });
            return (
              <g
                key={d.id}
                className="cursor-pointer"
                onMouseEnter={() => showTooltip(cx, cy, [
                  `📅 ${dateStr}`,
                  `Progress: ${d.progress}%`,
                  `Status: ${d.status}`,
                ])}
                onMouseLeave={hideTooltip}
              >
                {/* Larger invisible hit area */}
                <circle cx={cx} cy={cy} r="18" fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r="7"
                  className="fill-white dark:fill-indigo-400 stroke-indigo-600 dark:stroke-slate-900"
                  strokeWidth="4"
                />
              </g>
            );
          })}
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
    <div className="w-full flex flex-col gap-6">
      
      {/* Header Container */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-center gap-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex-shrink-0">
             <History size={24} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Variance Analysis</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Historical Delta Logging</p>
          </div>
        </div>
        
        <div className="w-full xl:w-96 flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 relative">
          <Search size={16} className="text-slate-400 absolute left-3" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex-grow bg-transparent border-none text-sm font-semibold text-slate-900 dark:text-white outline-none appearance-none cursor-pointer pl-6 pr-6 w-full"
          >
            {projects.map(p => <option key={p.id} value={p.id} className="dark:bg-slate-800">{p.name}</option>)}
          </select>
          <ChevronDown size={16} className="text-slate-400 absolute right-3 pointer-events-none" />
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
                      className={`group rounded-[1.5rem] border transition-all duration-300 ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/50 p-6 shadow-lg' : 'bg-slate-50 dark:bg-slate-800/40 border-transparent hover:border-slate-200 dark:hover:border-slate-700 p-4'
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
