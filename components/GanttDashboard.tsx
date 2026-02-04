
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

  // Constants for pixel-perfect alignment
  const HEADER_HEIGHT = 74;
  const SIDEBAR_WIDTH = 320;
  const PROJECT_ROW_HEIGHT = 80;
  const TASK_ROW_HEIGHT = 48;

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
              <div className="text-center py-1.5 text-[10px] font-black text-indigo-700 bg-indigo-50/30 border-b border-slate-100 uppercase tracking-widest">
                {year}
              </div>
              <div className="flex flex-grow items-center">
                {viewMode === 'quarter' && [1, 2, 3, 4].map(q => (
                  <div key={q} className="flex-1 text-[9px] text-center text-slate-600 font-bold border-r border-slate-100 last:border-0">Q{q}</div>
                ))}
                {viewMode === 'month' && monthNames.map(m => (
                  <div key={m} className="flex-1 text-[9px] text-center text-slate-600 font-bold border-r border-slate-100 last:border-0">{m}</div>
                ))}
                {viewMode === 'week' && monthNames.map((m) => (
                  <div key={m} className="flex-grow border-r border-slate-100 last:border-0 h-full flex flex-col justify-center">
                    <div className="text-[7px] text-center text-slate-600 font-black uppercase tracking-tighter">{m}</div>
                    <div className="flex justify-around">
                      {[1, 2, 3, 4].map(w => (
                        <div key={w} className="text-[6px] text-slate-500 font-bold">W{w}</div>
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
    <div className="flex flex-col gap-6">
      <div className="bg-white/80 glass rounded-[2.5rem] p-8 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex-shrink-0">
            <h3 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              Project Matrix Timeline
              <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md font-black uppercase">Live</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Resource and task allocation map</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 flex-grow">
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
              <select 
                value={filters.department}
                onChange={(e) => setFilters({...filters, department: e.target.value})}
                className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase focus:ring-0 outline-none cursor-pointer px-3 min-w-[120px]"
              >
                <option value="">Department</option>
                {masterData.departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="w-px h-4 bg-slate-300" />
              <select 
                value={filters.leader}
                onChange={(e) => setFilters({...filters, leader: e.target.value})}
                className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase focus:ring-0 outline-none cursor-pointer px-3 min-w-[120px]"
              >
                <option value="">Leader</option>
                {masterData.leaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <div className="w-px h-4 bg-slate-300" />
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase focus:ring-0 outline-none cursor-pointer px-3 min-w-[120px]"
              >
                <option value="">Status</option>
                {masterData.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              {(filters.department || filters.leader || filters.status) && (
                <button 
                  onClick={() => setFilters({ department: '', leader: '', status: '' })}
                  className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-full transition-all"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={expandAll} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all"><Maximize2 size={16} /></button>
              <button onClick={collapseAll} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all"><Minimize2 size={16} /></button>
            </div>

            <button 
              onClick={() => {
                if (mainScrollContainerRef.current) {
                  const todayPos = ((now.getTime() - startDate) / totalDuration) * timelineWidth;
                  mainScrollContainerRef.current.scrollTo({ left: todayPos - mainScrollContainerRef.current.clientWidth / 2, behavior: 'smooth' });
                }
              }}
              className="p-2.5 bg-white border border-slate-200 rounded-xl transition-all text-indigo-500 shadow-sm"
            >
              <Target size={18} />
            </button>
            
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              {[
                { id: 'week', label: 'Week', icon: CalendarDays },
                { id: 'month', label: 'Month', icon: LayoutGrid },
                { id: 'quarter', label: 'Quarter', icon: Columns },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as ViewMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
                    viewMode === mode.id ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <mode.icon size={12} />
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Synchronized Gantt Layout with Overlap Protection */}
        <div className="relative border border-slate-200 rounded-3xl overflow-hidden shadow-2xl bg-white h-[700px] flex flex-col">
          <div 
            ref={mainScrollContainerRef}
            className="w-full flex-grow overflow-auto relative"
          >
            <div className="min-h-full flex flex-col relative" style={{ width: `${SIDEBAR_WIDTH + timelineWidth}px` }}>
              
              {/* STICKY HEADER - Higher Z-index to cover everything */}
              <div className="flex sticky top-0 z-[60] bg-white border-b border-slate-200">
                <div 
                  className="sticky left-0 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex items-center px-6 z-[70] shadow-[4px_0_8px_rgba(0,0,0,0.02)]" 
                  style={{ width: `${SIDEBAR_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-700">Resource Matrix & Tasks</span>
                </div>
                <div className="flex-grow bg-white">
                   {renderTimelineHeaderContent()}
                </div>
              </div>

              {/* STICKY TODAY LINE */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                style={{ left: `${SIDEBAR_WIDTH + (getTimelinePosition(now.toISOString()) || 0) * (timelineWidth / 100)}px` }}
              >
                <div className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full absolute top-[74px] left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg">NOW</div>
              </div>

              {/* BODY ROWS */}
              <div className="flex flex-col relative z-10">
                {filteredProjects.map((project) => {
                  const projectStatus = masterData.statuses.find(s => s.name === project.status);
                  const taskDates = project.tasks?.flatMap(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()]) || [];
                  const pStart = taskDates.length > 0 ? Math.min(...taskDates) : startDate;
                  const pEnd = taskDates.length > 0 ? Math.max(...taskDates) : endDate;
                  
                  const startPos = getTimelinePosition(new Date(pStart).toISOString()) || 0;
                  const endPos = getTimelinePosition(new Date(pEnd).toISOString()) || 100;
                  const barWidth = Math.max(endPos - startPos, 1.5);
                  const hasTasks = project.tasks && project.tasks.length > 0;

                  return (
                    <React.Fragment key={project.id}>
                      {/* Project Row */}
                      <div className="flex border-b border-slate-100 group relative">
                        {/* Sidebar Cell: Increased z-index and opaque background to prevent bar overlap */}
                        <div 
                          className={`sticky left-0 flex-shrink-0 z-[50] bg-white border-r border-slate-200 flex items-center px-6 cursor-pointer hover:bg-indigo-50/30 transition-all shadow-[4px_0_8px_rgba(0,0,0,0.03)] ${expandedProjects[project.id] ? 'bg-indigo-50/5' : ''}`}
                          style={{ width: `${SIDEBAR_WIDTH}px`, height: `${PROJECT_ROW_HEIGHT}px` }}
                          onClick={() => toggleProject(project.id)}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: projectStatus?.color || '#cbd5e1' }} />
                          <div className="mr-3 text-slate-400">
                            {expandedProjects[project.id] ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-slate-700 truncate leading-tight">{project.name}</span>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="text-[9px] uppercase font-bold text-indigo-500">{project.leader}</span>
                              <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black">{project.status}</span>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Cell: Lower z-index so bars slide UNDER the sidebar */}
                        <div className="flex-grow relative bg-white/30 h-20 z-0">
                          <div className="absolute inset-0 flex pointer-events-none z-0">
                            {Array.from({ length: viewMode === 'week' ? 144 : 48 }).map((_, i) => (
                              <div key={i} className="flex-1 border-r border-slate-100/30 last:border-0" />
                            ))}
                          </div>

                          <div className="h-full flex items-center relative z-10">
                             {hasTasks && (
                                <div 
                                  className="absolute h-12 bg-white rounded-2xl flex items-center overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.15)] border-2 border-slate-700 group-hover:border-indigo-600 transition-all duration-300"
                                  style={{ left: `${startPos}%`, width: `${barWidth}%` }}
                                >
                                  <div 
                                    className="h-full transition-all duration-1000 ease-out"
                                    style={{ 
                                        width: `${project.progress}%`,
                                        backgroundColor: projectStatus?.color || '#6366f1',
                                        filter: 'brightness(1.1)'
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                    <span className="text-[10px] font-black text-slate-950 uppercase tracking-tighter">
                                      {project.progress}% MASTER PROGRESS
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Task Detail Rows */}
                      {expandedProjects[project.id] && project.tasks?.map(task => {
                        const tStartPos = getTimelinePosition(task.startDate) || 0;
                        const tEndPos = getTimelinePosition(task.endDate) || 0;
                        const tBarWidth = Math.max(tEndPos - tStartPos, 1);

                        return (
                          <div key={task.id} className="flex border-b border-slate-50 last:border-0 group/task relative">
                            <div 
                              className="sticky left-0 flex-shrink-0 z-[50] bg-slate-50 border-r border-slate-200 flex items-center pl-12 pr-6 shadow-[4px_0_8px_rgba(0,0,0,0.02)]"
                              style={{ width: `${SIDEBAR_WIDTH}px`, height: `${TASK_ROW_HEIGHT}px` }}
                            >
                              <ListChecks size={13} className="text-slate-300 mr-3 flex-shrink-0" />
                              <div className="flex items-center justify-between w-full min-w-0">
                                <span className="text-[10px] text-slate-500 font-bold truncate leading-none">{task.name}</span>
                                <span className="text-[9px] text-indigo-400 font-black uppercase bg-indigo-50 px-1.5 py-0.5 rounded-md ml-2">W: {task.weight || 0}%</span>
                              </div>
                            </div>

                            <div className="flex-grow relative bg-slate-50/5 h-12 z-0">
                               <div 
                                  className="absolute h-7 bg-white rounded-xl flex items-center overflow-hidden border-2 border-slate-200 shadow-sm group-hover/task:border-indigo-400 group-hover/task:shadow-lg transition-all duration-300 z-10"
                                  style={{ left: `${tStartPos}%`, width: `${tBarWidth}%`, top: '50%', transform: 'translateY(-50%)' }}
                                >
                                  <div 
                                    className="h-full bg-indigo-500/90 transition-all duration-700"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                    <span className="text-[9px] font-black text-slate-600 mix-blend-difference uppercase truncate">
                                      {task.progress}% DONE
                                    </span>
                                  </div>
                                </div>

                                <div className="absolute opacity-0 group-hover/task:opacity-100 transition-all duration-200 bg-slate-900 text-white text-[10px] font-bold p-3 rounded-2xl shadow-2xl z-50 pointer-events-none transform -translate-y-12 border border-white/10" style={{ left: `${tStartPos}%`, top: '0' }}>
                                  <div className="text-indigo-300 font-black mb-1 uppercase tracking-wider">{task.name}</div>
                                  <div className="flex gap-4 opacity-80 text-[9px]">
                                    <span>Weight: {task.weight || 0}%</span>
                                    <span>{task.startDate} - {task.endDate}</span>
                                  </div>
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
