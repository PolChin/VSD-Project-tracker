
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, Task, MasterData } from '../types';
import { 
  CalendarDays, 
  LayoutGrid, 
  Columns, 
  Target, 
  ChevronDown, 
  ChevronRight, 
  ListChecks, 
  Maximize2, 
  Minimize2,
  XCircle,
  Search
} from 'lucide-react';

interface GanttDashboardProps {
  projects: Project[];
  masterData: MasterData;
}

type ViewMode = 'week' | 'month' | 'quarter';

const GanttDashboard: React.FC<GanttDashboardProps> = ({ projects, masterData }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    department: '',
    leader: '',
    status: ''
  });
  
  const mainScrollContainerRef = useRef<HTMLDivElement>(null);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const rangeStartYear = currentYear - 1;
  const rangeEndYear = currentYear + 2;
  
  const startDate = new Date(`${rangeStartYear}-01-01`).getTime();
  const endDate = new Date(`${rangeEndYear}-12-31`).getTime();
  const totalDuration = endDate - startDate;

  // Optimized constants for efficiency
  const HEADER_HEIGHT = 54;
  const SIDEBAR_WIDTH = 240;
  const PROJECT_ROW_HEIGHT = 54;
  const TASK_ROW_HEIGHT = 32;

  useEffect(() => {
    if (mainScrollContainerRef.current) {
      const container = mainScrollContainerRef.current;
      const timelineWidth = viewMode === 'week' ? 5500 : viewMode === 'month' ? 2800 : 1800;
      const todayPos = ((now.getTime() - startDate) / totalDuration) * timelineWidth;
      container.scrollLeft = todayPos - container.clientWidth / 3;
    }
  }, [viewMode, startDate, totalDuration]);

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded = projects.reduce((acc, p) => ({ ...acc, [p.id]: true }), {});
    setExpandedProjects(allExpanded);
  };

  const collapseAll = () => {
    setExpandedProjects({});
  };

  const getTimelinePosition = (dateStr?: string) => {
    if (!dateStr) return null;
    const targetDate = new Date(dateStr).getTime();
    if (targetDate < startDate) return 0;
    if (targetDate > endDate) return 100;
    return ((targetDate - startDate) / totalDuration) * 100;
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const pDept = (p.department || '').toString().trim().toUpperCase();
      const fDept = (filters.department || '').toString().trim().toUpperCase();
      const matchDept = !filters.department || pDept === fDept;
      
      const pLeader = (p.leader || '').toString().trim().toUpperCase();
      const fLeader = (filters.leader || '').toString().trim().toUpperCase();
      const matchLeader = !filters.leader || pLeader === fLeader;
      
      const pStatus = (p.status || '').toString().trim().toUpperCase();
      const fStatus = (filters.status || '').toString().trim().toUpperCase();
      const matchStatus = !filters.status || pStatus === fStatus;
        
      return matchDept && matchLeader && matchStatus;
    });
  }, [projects, filters]);

  const years = Array.from({ length: rangeEndYear - rangeStartYear + 1 }, (_, i) => rangeStartYear + i);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const renderTimelineHeaderContent = () => {
    return (
      <div className="flex bg-white" style={{ height: `${HEADER_HEIGHT}px` }}>
        {years.map(year => {
          const yearStart = new Date(`${year}-01-01`).getTime();
          const yearEnd = new Date(`${year}-12-31`).getTime();
          const yearWidth = ((yearEnd - yearStart) / totalDuration) * 100;

          return (
            <div key={year} style={{ width: `${yearWidth}%` }} className="border-r border-slate-200 last:border-0 flex-shrink-0 flex flex-col">
              <div className="text-center py-1 text-[9px] font-black text-indigo-700 bg-indigo-50/30 border-b border-slate-100 uppercase tracking-widest">
                {year}
              </div>
              <div className="flex flex-grow items-center">
                {viewMode === 'quarter' && [1, 2, 3, 4].map(q => (
                  <div key={q} className="flex-1 text-[8px] text-center text-slate-600 font-bold border-r border-slate-100 last:border-0">Q{q}</div>
                ))}
                {viewMode === 'month' && monthNames.map(m => (
                  <div key={m} className="flex-1 text-[8px] text-center text-slate-600 font-bold border-r border-slate-100 last:border-0">{m}</div>
                ))}
                {viewMode === 'week' && monthNames.map((m) => (
                  <div key={m} className="flex-grow border-r border-slate-100 last:border-0 h-full flex flex-col justify-center">
                    <div className="text-[7px] text-center text-slate-600 font-black uppercase tracking-tighter leading-none">{m}</div>
                    <div className="flex justify-around mt-0.5">
                      {[1, 2, 3, 4].map(w => (
                        <div key={w} className="text-[6px] text-slate-400 font-bold">W{w}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const timelineWidth = viewMode === 'week' ? 5500 : viewMode === 'month' ? 2800 : 1800;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/80 glass rounded-2xl p-4 shadow-lg overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Condensed Toolbar */}
        <div className="flex flex-col xl:flex-row justify-between items-center mb-4 gap-3">
          <div className="flex-shrink-0">
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 leading-none">
              Timeline Matrix
              <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-black uppercase">Live</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 flex-grow">
            <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
              <select 
                value={filters.department}
                onChange={(e) => setFilters({...filters, department: e.target.value})}
                className="bg-transparent border-none text-[9px] font-black text-slate-500 uppercase focus:ring-0 outline-none cursor-pointer px-2 min-w-[80px]"
              >
                <option value="">Dept</option>
                {masterData.departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="w-px h-3 bg-slate-300" />
              <select 
                value={filters.leader}
                onChange={(e) => setFilters({...filters, leader: e.target.value})}
                className="bg-transparent border-none text-[9px] font-black text-slate-500 uppercase focus:ring-0 outline-none cursor-pointer px-2 min-w-[80px]"
              >
                <option value="">Leader</option>
                {masterData.leaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <div className="w-px h-3 bg-slate-300" />
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="bg-transparent border-none text-[9px] font-black text-slate-500 uppercase focus:ring-0 outline-none cursor-pointer px-2 min-w-[80px]"
              >
                <option value="">Status</option>
                {masterData.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              {(filters.department || filters.leader || filters.status) && (
                <button 
                  onClick={() => setFilters({ department: '', leader: '', status: '' })}
                  className="p-1 text-rose-500 hover:bg-rose-100 rounded-full transition-all"
                >
                  <XCircle size={12} />
                </button>
              )}
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button onClick={expandAll} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Maximize2 size={14} /></button>
              <button onClick={collapseAll} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Minimize2 size={14} /></button>
            </div>

            <button 
              onClick={() => {
                if (mainScrollContainerRef.current) {
                  const todayPos = ((now.getTime() - startDate) / totalDuration) * timelineWidth;
                  mainScrollContainerRef.current.scrollTo({ left: todayPos - mainScrollContainerRef.current.clientWidth / 2, behavior: 'smooth' });
                }
              }}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-indigo-500 shadow-sm"
            >
              <Target size={16} />
            </button>
            
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {['week', 'month', 'quarter'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as ViewMode)}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                    viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dense Gantt Grid */}
        <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-white h-[600px] flex flex-col">
          <div 
            ref={mainScrollContainerRef}
            className="w-full flex-grow overflow-auto relative no-scrollbar"
          >
            <div className="min-h-full flex flex-col relative" style={{ width: `${SIDEBAR_WIDTH + timelineWidth}px` }}>
              
              <div className="flex sticky top-0 z-[60] bg-white border-b border-slate-200">
                <div 
                  className="sticky left-0 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex items-center px-4 z-[70]" 
                  style={{ width: `${SIDEBAR_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Resource Matrix</span>
                </div>
                <div className="flex-grow bg-white">
                   {renderTimelineHeaderContent()}
                </div>
              </div>

              <div 
                className="absolute top-0 bottom-0 w-[1px] bg-rose-500 z-30 pointer-events-none opacity-60"
                style={{ left: `${SIDEBAR_WIDTH + (getTimelinePosition(now.toISOString()) || 0) * (timelineWidth / 100)}px` }}
              />

              <div className="flex flex-col relative z-10">
                {filteredProjects.map((project) => {
                  const projectStatus = masterData.statuses.find(s => s.name === project.status);
                  const taskDates = project.tasks?.flatMap(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()]) || [];
                  const pStart = taskDates.length > 0 ? Math.min(...taskDates) : startDate;
                  const pEnd = taskDates.length > 0 ? Math.max(...taskDates) : endDate;
                  
                  const startPos = getTimelinePosition(new Date(pStart).toISOString()) || 0;
                  const endPos = getTimelinePosition(new Date(pEnd).toISOString()) || 100;
                  const barWidth = Math.max(endPos - startPos, 1);
                  const hasTasks = project.tasks && project.tasks.length > 0;

                  return (
                    <React.Fragment key={project.id}>
                      <div className="flex border-b border-slate-100 group relative">
                        <div 
                          className={`sticky left-0 flex-shrink-0 z-[50] bg-white border-r border-slate-200 flex items-center px-4 cursor-pointer hover:bg-indigo-50/20 transition-all ${expandedProjects[project.id] ? 'bg-indigo-50/5' : ''}`}
                          style={{ width: `${SIDEBAR_WIDTH}px`, height: `${PROJECT_ROW_HEIGHT}px` }}
                          onClick={() => toggleProject(project.id)}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: projectStatus?.color || '#cbd5e1' }} />
                          <div className="mr-2 text-slate-400">
                            {expandedProjects[project.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">{project.name}</span>
                            <span className="text-[8px] uppercase font-black text-indigo-400 mt-0.5">{project.leader}</span>
                          </div>
                        </div>

                        <div className="flex-grow relative h-[54px] z-0">
                          <div className="h-full flex items-center relative z-10 px-0.5">
                             {hasTasks && (
                                <div 
                                  className="absolute h-6 bg-white rounded-lg flex items-center overflow-hidden border border-slate-300 shadow-sm"
                                  style={{ left: `${startPos}%`, width: `${barWidth}%` }}
                                >
                                  <div 
                                    className="h-full opacity-80"
                                    style={{ 
                                        width: `${project.progress}%`,
                                        backgroundColor: projectStatus?.color || '#6366f1'
                                    }}
                                  />
                                  <span className="absolute left-2 text-[8px] font-black text-slate-800 pointer-events-none uppercase">
                                    {project.progress}%
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      {expandedProjects[project.id] && project.tasks?.map(task => {
                        const tStartPos = getTimelinePosition(task.startDate) || 0;
                        const tEndPos = getTimelinePosition(task.endDate) || 0;
                        const tBarWidth = Math.max(tEndPos - tStartPos, 0.5);

                        return (
                          <div key={task.id} className="flex border-b border-slate-50 bg-slate-50/20 relative">
                            <div 
                              className="sticky left-0 flex-shrink-0 z-[50] bg-slate-50 border-r border-slate-200 flex items-center pl-8 pr-4"
                              style={{ width: `${SIDEBAR_WIDTH}px`, height: `${TASK_ROW_HEIGHT}px` }}
                            >
                              <ListChecks size={10} className="text-slate-300 mr-2" />
                              <span className="text-[9px] text-slate-500 font-bold truncate">{task.name}</span>
                            </div>

                            <div className="flex-grow relative h-[32px] z-0">
                               <div 
                                  className="absolute h-3.5 bg-white border border-slate-200 rounded-md overflow-hidden z-10 shadow-sm"
                                  style={{ left: `${tStartPos}%`, width: `${tBarWidth}%`, top: '50%', transform: 'translateY(-50%)' }}
                                >
                                  <div className="h-full bg-indigo-500/60" style={{ width: `${task.progress}%` }} />
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttDashboard;
