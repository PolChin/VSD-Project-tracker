import React, { useMemo, useState } from 'react';
import { Project, MasterData } from '../types';
import {
  BarChart2,
  AlertTriangle,
  Clock,
  Target,
  LayoutGrid,
  Users,
  Activity,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DashboardReportProps {
  projects: Project[];
  masterData: MasterData;
}

const DashboardReport: React.FC<DashboardReportProps> = ({ projects, masterData }) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const getStatusColor = (statusName: string) => {
    return masterData.statuses.find((s) => s.name === statusName)?.color || '#94a3b8';
  };

  const getStatusHexOpacity = (color: string, opacity: number) => {
    // Quick hex to rgba helper for inline styles
    if (color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedStatus && p.status !== selectedStatus) {
        // Special case: 'pipeline' matches Planning or Pending if they exist
        if (selectedStatus === 'pipeline' && !(p.status === 'Planning' || p.status === 'Pending')) {
             return false;
        } else if (selectedStatus !== 'pipeline' && p.status !== selectedStatus) {
             return false;
        }
      }
      if (selectedLeader && p.leader !== selectedLeader) return false;
      if (selectedDept && p.department !== selectedDept) return false;
      return true;
    });
  }, [projects, selectedStatus, selectedLeader, selectedDept]);

  // General KPIs based on ALL projects
  const totalProjects = projects.length;
  const inProgressCount = projects.filter((p) => p.status === 'In Progress').length;
  const completedCount = projects.filter((p) => p.status === 'Completed').length;
  const delayCount = projects.filter((p) => p.status === 'Delay').length;
  const pipelineCount = projects.filter((p) => p.status === 'Planning' || p.status === 'Pending').length;

  const inProgColor = getStatusColor('In Progress');
  const compColor = getStatusColor('Completed');
  const delayColor = getStatusColor('Delay');
  const pendingColor = getStatusColor('Pending') !== '#94a3b8' ? getStatusColor('Pending') : getStatusColor('Planning');

  // Status Distribution Array
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    masterData.statuses.forEach(s => counts[s.name] = 0);
    // Include unmapped statuses just in case
    projects.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    // Sort array by count descending
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, color: getStatusColor(name) }))
      .sort((a, b) => b.count - a.count);
  }, [projects, masterData]);

  // Leader Workload Array
  const leaderWorkload = useMemo(() => {
    const leadersMap = new Map<string, { total: number; active: number; done: number }>();
    masterData.leaders.forEach(l => leadersMap.set(l, { total: 0, active: 0, done: 0 }));
    
    projects.forEach(p => {
      const leader = p.leader || 'Unassigned';
      if (!leadersMap.has(leader)) leadersMap.set(leader, { total: 0, active: 0, done: 0 });
      const stats = leadersMap.get(leader)!;
      stats.total += 1;
      if (p.status === 'Completed') stats.done += 1;
      else stats.active += 1;
    });

    return Array.from(leadersMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .filter(l => l.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [projects, masterData]);

  // Department Coverage Array
  const deptCoverage = useMemo(() => {
    const deptsMap = new Map<string, number>();
    masterData.departments.forEach(d => deptsMap.set(d, 0));
    projects.forEach(p => {
      const dept = p.department || 'General';
      deptsMap.set(dept, (deptsMap.get(dept) || 0) + 1);
    });

    const colors = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    return Array.from(deptsMap.entries())
      .map(([name, count], index) => ({ name, count, color: colors[index % colors.length] }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [projects, masterData]);

  // Attention Projects (Filtered by active selections)
  const delayedProjects = filteredProjects.filter(p => p.status === 'Delay').sort((a,b) => a.progress - b.progress);
  const zeroProgressProjects = filteredProjects.filter(p => p.status === 'In Progress' && p.progress === 0);
  const pipelineProjects = filteredProjects.filter(p => p.status === 'Planning' || p.status === 'Pending');

  const handleFilterToggle = (type: 'status' | 'leader' | 'dept', value: string) => {
    if (type === 'status') setSelectedStatus(prev => prev === value ? null : value);
    if (type === 'leader') setSelectedLeader(prev => prev === value ? null : value);
    if (type === 'dept') setSelectedDept(prev => prev === value ? null : value);
  };

  const clearAllFilters = () => {
    setSelectedStatus(null);
    setSelectedLeader(null);
    setSelectedDept(null);
  };

  const hasActiveFilters = selectedStatus || selectedLeader || selectedDept;

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-hidden pt-2">
      {/* COMPACT HEADER SECTION */}
      <div className="h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 rounded-2xl shadow-sm flex justify-between items-center shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <LayoutGrid size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight leading-none">
              Interactive Dashboard
            </h1>
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-widest">
              Overview
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
             {hasActiveFilters && (
               <div className="flex items-center gap-3 md:gap-4 bg-indigo-600 dark:bg-indigo-500 rounded-xl px-3 md:px-4 py-1.5 text-white shadow-sm animate-in fade-in zoom-in-95 duration-300 transition-all">
                 <div className="items-center gap-2 hidden sm:flex whitespace-nowrap">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Filtered Active:</span>
                    <span className="text-xs font-bold">{filteredProjects.length} items</span>
                 </div>
                 <div className="w-px h-4 bg-indigo-400 hidden sm:block"></div>
                 <button onClick={clearAllFilters} className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                    Reset <AlertTriangle size={12} />
                 </button>
               </div>
             )}
             <div className="font-mono text-[10px] px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800 shadow-inner font-black uppercase hidden md:block">
               {new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric'})}
             </div>
        </div>
      </div>

      {/* COMMAND CENTER: SIDE-BY-SIDE PANELS */}
      <div className="flex-grow min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* LEFT PANEL: FILTERS & ANALYTICS */}
        <div className="w-full lg:w-[35%] flex flex-col gap-4 overflow-y-scroll custom-scrollbar pr-2 pb-4">
          
          {/* VERTICAL COMPACT KPIS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2 shrink-0">
             <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
               <Target size={12} /> Portfolio Metrics
             </div>
             
             {/* All Projects */}
             <div 
               onClick={() => handleFilterToggle('status', 'all')}
               className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${selectedStatus === 'all' || !selectedStatus ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'}`}
             >
                <div className="flex items-center gap-2">
                  <Layers size={14} className={selectedStatus === 'all' || !selectedStatus ? 'text-indigo-500' : 'text-slate-400'} />
                  <span className="text-xs font-bold">Total Projects</span>
                </div>
                <span className="font-mono text-base font-black">{totalProjects}</span>
             </div>

             {/* In Progress */}
             <div 
               onClick={() => handleFilterToggle('status', 'In Progress')}
               className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${selectedStatus === 'In Progress' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
               style={{ color: selectedStatus === 'In Progress' ? inProgColor : undefined }}
             >
                <div className="flex items-center gap-2">
                  <Activity size={14} style={{ color: inProgColor }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-bold text-slate-400">{Math.round((inProgressCount/totalProjects)*100 || 0)}%</span>
                   <span className="font-mono text-base font-black" style={{ color: inProgColor }}>{inProgressCount}</span>
                </div>
             </div>

             {/* Completed */}
             <div 
               onClick={() => handleFilterToggle('status', 'Completed')}
               className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${selectedStatus === 'Completed' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
               style={{ color: selectedStatus === 'Completed' ? compColor : undefined }}
             >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: compColor }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-bold text-slate-400">{Math.round((completedCount/totalProjects)*100 || 0)}%</span>
                   <span className="font-mono text-base font-black" style={{ color: compColor }}>{completedCount}</span>
                </div>
             </div>

             {/* Delayed */}
             <div 
               onClick={() => handleFilterToggle('status', 'Delay')}
               className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${selectedStatus === 'Delay' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
               style={{ color: selectedStatus === 'Delay' ? delayColor : undefined }}
             >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} style={{ color: delayColor }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Delayed</span>
                </div>
                <span className="font-mono text-base font-black" style={{ color: delayColor }}>{delayCount}</span>
             </div>

             {/* Pipeline */}
             <div 
               onClick={() => handleFilterToggle('status', 'pipeline')}
               className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${selectedStatus === 'pipeline' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
               style={{ color: selectedStatus === 'pipeline' ? pendingColor : undefined }}
             >
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: pendingColor }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pipeline</span>
                </div>
                <span className="font-mono text-base font-black" style={{ color: pendingColor }}>{pipelineCount}</span>
             </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col shrink-0">
            <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Distribution
            </div>
            <div className="flex w-full h-4 rounded overflow-hidden gap-[1px]">
              {statusDistribution.map(stat => stat.count > 0 && (
                <div 
                  key={stat.name}
                  onClick={() => handleFilterToggle('status', stat.name)}
                  title={`${stat.name}: ${stat.count}`}
                  className="h-full hover:brightness-110 cursor-pointer transition-all"
                  style={{ backgroundColor: stat.color, flexGrow: stat.count / totalProjects, width: `${(stat.count / totalProjects) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
              {statusDistribution.map(stat => stat.count > 0 && (
                <div key={stat.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400" onClick={() => handleFilterToggle('status', stat.name)}>
                  <span className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: stat.color }}></span>
                  {stat.name} <span className="text-slate-400 font-mono">({stat.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Workload by Leader */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col min-h-[220px] shrink-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
               <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] font-black">
                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                 Workload by Leader
               </div>
               <div className="text-[8px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-400 font-bold uppercase">Filter</div>
            </div>
            <div className="overflow-y-scroll custom-scrollbar pr-1 flex-grow space-y-1">
              {leaderWorkload.map(leader => {
                const maxCount = leaderWorkload[0].total; // For scaling
                return (
                  <div 
                    key={leader.name} 
                    onClick={() => handleFilterToggle('leader', leader.name)}
                    className={`grid grid-cols-[80px_1fr_25px] items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all border border-transparent ${selectedLeader === leader.name ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {leader.name}
                      <div className="text-[8px] font-semibold text-slate-400 block">{leader.active} a · {leader.done} d</div>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded flex overflow-hidden">
                       <div className="h-full bg-indigo-400 dark:bg-indigo-500" style={{ width: `${(leader.active / maxCount) * 100}%`}}></div>
                       <div className="h-full bg-emerald-400 dark:bg-emerald-500" style={{ width: `${(leader.done / maxCount) * 100}%`}}></div>
                    </div>
                    <div className="text-right font-mono text-xs font-black text-slate-600 dark:text-slate-300">
                      {leader.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department Coverage */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col min-h-[180px] shrink-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
               <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] font-black">
                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                 Department Coverage
               </div>
               <div className="text-[8px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-400 font-bold uppercase">Filter</div>
            </div>
            <div className="overflow-y-scroll custom-scrollbar pr-1 flex-grow space-y-1">
               {deptCoverage.map(dept => (
                 <div 
                  key={dept.name}
                  onClick={() => handleFilterToggle('dept', dept.name)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all border border-transparent ${selectedDept === dept.name ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                 >
                   <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }}></div>
                   <div className="font-mono text-xs font-black flex-shrink-0 w-6" style={{ color: dept.color }}>{dept.count}</div>
                   <div className="truncate">
                     <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{dept.name}</div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: ACTIONABLE RESULTS */}
        <div className="w-full lg:w-[65%] flex flex-col gap-4 overflow-y-scroll custom-scrollbar pr-2 pb-4 relative">
          
          {/* UPPER GRID: Delays & Zero Progress (Takes roughly top half) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-shrink-0 min-h-[250px] lg:h-[40%]">
             
             {/* Delayed Projects */}
             <div className="bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
               <div className="flex items-center gap-2 mb-3 text-rose-600 dark:text-rose-400 uppercase tracking-widest text-[11px] font-black shrink-0">
                 <AlertTriangle size={14} /> Delayed Projects
               </div>
                 <div className="overflow-y-scroll custom-scrollbar flex-grow space-y-2 pr-1">
                  {delayedProjects.length === 0 && <span className="text-[10px] font-bold text-slate-400">No delayed projects in view.</span>}
                  {delayedProjects.map(p => (
                    <div key={p.id} className="bg-white dark:bg-slate-900 border-l-4 border-rose-500 rounded-lg p-2.5 flex flex-col gap-1 shadow-sm">
                       <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{p.name}</span>
                       <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold gap-2">
                         <span className="truncate">{p.leader} · {p.department} {p.ciNo ? `· ${p.ciNo}` : ''}</span>
                         <span className="font-mono text-rose-500 font-black shrink-0">{p.progress}%</span>
                       </div>
                    </div>
                  ))}
               </div>
             </div>

             {/* Stuck at 0% */}
             <div className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
               <div className="flex items-center gap-2 mb-3 text-amber-500 dark:text-amber-400 uppercase tracking-widest text-[11px] font-black shrink-0">
                 <Clock size={14} /> In Progress · 0%
               </div>
               <div className="overflow-y-scroll custom-scrollbar flex-grow space-y-2 pr-1">
                  {zeroProgressProjects.length === 0 && <span className="text-[10px] font-bold text-slate-400">No stuck projects in view.</span>}
                  {zeroProgressProjects.map(p => (
                    <div key={p.id} className="bg-white dark:bg-slate-900 border-l-4 border-amber-500 rounded-lg p-2.5 flex flex-col gap-1 shadow-sm">
                       <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{p.name}</span>
                       <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold gap-2">
                         <span className="truncate">{p.leader} · {p.department} {p.ciNo ? `· ${p.ciNo}` : ''}</span>
                         <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-black uppercase text-[8px] shrink-0">0%</span>
                       </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>

          {/* LOWER FULL ROW: Pipeline Card (Takes the rest of the height) */}
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col flex-grow min-h-[250px] overflow-hidden">
             <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[11px] font-black shrink-0">
                 <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pendingColor }}></span> Pipeline — Planning & Pending
             </div>
             <div className="overflow-y-scroll custom-scrollbar flex-grow space-y-1.5 pr-1">
                {pipelineProjects.length === 0 && <span className="text-[10px] font-bold text-slate-400">No pipeline projects in view.</span>}
                {pipelineProjects.map(p => (
                  <div key={p.id} className="bg-slate-50/50 dark:bg-slate-950/50 border-l-[3px] rounded-lg p-2.5 flex flex-row justify-between items-center gap-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50" style={{ borderLeftColor: getStatusColor(p.status) }}>
                     <div className="flex flex-col overflow-hidden">
                       <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                       <span className="text-[9px] text-slate-500 font-semibold truncate mt-0.5">{p.leader} · {p.department} {p.ciNo ? `· ${p.ciNo}` : ''}</span>
                     </div>
                     <span className="px-2 py-0.5 flex-shrink-0 rounded text-[8px] font-black uppercase tracking-wider text-white shadow-sm" style={{ backgroundColor: getStatusColor(p.status) }}>
                       {p.status}
                     </span>
                  </div>
                ))}
             </div>
           </div>

        </div>
      </div>


    </div>
  );
};

export default DashboardReport;

