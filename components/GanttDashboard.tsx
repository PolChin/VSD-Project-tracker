
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, Task, MasterData, Milestone } from '../types';
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
  Search,
  Flag,
  FileDown,
  FileSpreadsheet,
  Calendar,
  X,
  Plus,
  Minus,
  CheckCircle2
} from 'lucide-react';

interface GanttDashboardProps {
  projects: Project[];
  masterData: MasterData;
}

type ViewMode = 'week' | 'month' | 'quarter';

const GanttDashboard: React.FC<GanttDashboardProps> = ({ projects, masterData }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [zoomScale, setZoomScale] = useState<number>(1);
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

  const HEADER_HEIGHT = 54;
  const SIDEBAR_WIDTH = 240;
  const PROJECT_ROW_HEIGHT = 54;
  const TASK_ROW_HEIGHT = 32;

  const baseTimelineWidth = viewMode === 'week' ? 5500 : viewMode === 'month' ? 2800 : 1800;
  const timelineWidth = baseTimelineWidth * zoomScale;

  useEffect(() => {
    if (mainScrollContainerRef.current) {
      const container = mainScrollContainerRef.current;
      const todayPos = ((now.getTime() - startDate) / totalDuration) * timelineWidth;
      container.scrollLeft = todayPos - container.clientWidth / 3;
    }
  }, [viewMode, zoomScale, startDate, totalDuration]);

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
      <div className="flex bg-white dark:bg-slate-900" style={{ height: `${HEADER_HEIGHT}px` }}>
        {years.map(year => {
          const yearStart = new Date(`${year}-01-01`).getTime();
          const yearEnd = new Date(`${year}-12-31`).getTime();
          const yearWidth = ((yearEnd - yearStart) / totalDuration) * 100;

          return (
            <div key={year} style={{ width: `${yearWidth}%` }} className="border-r border-slate-200 dark:border-slate-700 last:border-0 flex-shrink-0 flex flex-col">
              <div className="text-center py-0.5 text-[13px] font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 uppercase tracking-widest">
                {year}
              </div>
              <div className="flex-grow bg-white dark:bg-slate-900">
                <div className="flex h-full items-center">
                  {viewMode === 'quarter' && [1, 2, 3, 4].map(q => (
                    <div key={q} className="flex-1 text-[12px] text-center text-slate-600 dark:text-slate-400 font-bold border-r border-slate-100 dark:border-slate-800 last:border-0">Q{q}</div>
                  ))}
                  {viewMode === 'month' && monthNames.map(m => (
                    <div key={m} className="flex-1 text-[12px] text-center text-slate-600 dark:text-slate-400 font-bold border-r border-slate-100 dark:border-slate-800 last:border-0">{m}</div>
                  ))}
                  {viewMode === 'week' && monthNames.map((m) => (
                    <div key={m} className="flex-grow border-r border-slate-100 dark:border-slate-800 last:border-0 h-full flex flex-col justify-center">
                      <div className="text-[11px] text-center text-slate-600 dark:text-slate-400 font-black uppercase tracking-tighter leading-none">{m}</div>
                      <div className="flex justify-around mt-0.5">
                        {[1, 2, 3, 4].map(w => (
                          <div key={w} className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">W{w}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.2, 0.4));

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/80 dark:bg-slate-900/60 glass rounded-2xl p-4 shadow-lg overflow-hidden flex flex-col">

        <div className="flex flex-col xl:flex-row items-center justify-between mb-4 gap-4">
          <div className="flex-shrink-0">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2 leading-none">
              Timeline
              <span className="text-[8px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">Live</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 flex-grow">
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="bg-transparent border-none text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase focus:ring-0 outline-none cursor-pointer px-2 min-w-[90px]"
              >
                <option value="" className="dark:bg-slate-800">Owner's Dept.</option>
                {masterData.departments.map(d => <option key={d} value={d} className="dark:bg-slate-800">{d}</option>)}
              </select>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
              <select
                value={filters.leader}
                onChange={(e) => setFilters({ ...filters, leader: e.target.value })}
                className="bg-transparent border-none text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase focus:ring-0 outline-none cursor-pointer px-2 min-w-[90px]"
              >
                <option value="" className="dark:bg-slate-800">Leader</option>
                {masterData.leaders.map(l => <option key={l} value={l} className="dark:bg-slate-800">{l}</option>)}
              </select>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="bg-transparent border-none text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase focus:ring-0 outline-none cursor-pointer px-2 min-w-[90px]"
              >
                <option value="" className="dark:bg-slate-800">Status</option>
                {masterData.statuses.map(s => <option key={s.id} value={s.name} className="dark:bg-slate-800">{s.name}</option>)}
              </select>
              {(filters.department || filters.leader || filters.status) && (
                <button
                  onClick={() => setFilters({ department: '', leader: '', status: '' })}
                  className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-full transition-all"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <button onClick={handleZoomOut} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-90" title="Zoom Out"><Minus size={14} /></button>
              <div className="w-px h-4 self-center bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <button onClick={handleZoomIn} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-90" title="Zoom In"><Plus size={14} /></button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button onClick={expandAll} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-all"><Maximize2 size={14} /></button>
                <button onClick={collapseAll} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-all"><Minimize2 size={14} /></button>
              </div>

              <button
                onClick={() => {
                  if (mainScrollContainerRef.current) {
                    const todayPos = ((now.getTime() - startDate) / totalDuration) * timelineWidth;
                    mainScrollContainerRef.current.scrollTo({ left: todayPos - mainScrollContainerRef.current.clientWidth / 2, behavior: 'smooth' });
                  }
                }}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-500 dark:text-indigo-400 shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                title="Go to Today"
              >
                <Target size={16} />
              </button>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {['week', 'month', 'quarter'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as ViewMode)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === mode ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 h-[600px] flex flex-col shadow-inner">
          <div
            ref={mainScrollContainerRef}
            className="w-full flex-grow overflow-auto relative"
          >
            <div className="min-h-full flex flex-col relative" style={{ width: `${SIDEBAR_WIDTH + timelineWidth}px` }}>

              <div className="flex sticky top-0 z-[160] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div
                  className="sticky left-0 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex items-center px-4 z-[170] shadow-sm"
                  style={{ width: `${SIDEBAR_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
                >
                  <span className="text-[13px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Projects</span>
                </div>
                <div className="flex-grow bg-white dark:bg-slate-900">
                  {renderTimelineHeaderContent()}
                </div>
              </div>

              <div
                className="absolute top-0 bottom-0 w-[1px] bg-rose-500 z-[155] pointer-events-none opacity-60"
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
                  const isExpanded = expandedProjects[project.id];

                  return (
                    <React.Fragment key={project.id}>
                      <div className="flex border-b border-slate-100 dark:border-slate-800 group relative transition-all">
                        <div
                          className={`sticky left-0 flex-shrink-0 z-[150] border-r border-slate-200 dark:border-slate-800 flex items-center px-4 cursor-pointer transition-all shadow-sm ${isExpanded ? 'bg-indigo-50 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'
                            } hover:bg-slate-50 dark:hover:bg-slate-800`}
                          style={{ width: `${SIDEBAR_WIDTH}px`, height: `${PROJECT_ROW_HEIGHT}px` }}
                          onClick={() => toggleProject(project.id)}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: projectStatus?.color || '#cbd5e1' }} />
                          <div className="mr-2 text-slate-400 dark:text-slate-500">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{project.name}</span>
                            <span className="text-[8px] uppercase font-black text-indigo-500 dark:text-indigo-400 mt-0.5">{project.leader}</span>
                          </div>
                        </div>

                        <div className="flex-grow relative h-[54px]">
                          <div className="h-full flex items-center relative z-10 px-0.5">
                            {hasTasks && (
                              <div
                                className="absolute h-6 bg-white dark:bg-slate-800 rounded-lg flex items-center overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm"
                                style={{ left: `${startPos}%`, width: `${barWidth}%` }}
                              >
                                <div
                                  className="h-full opacity-90"
                                  style={{
                                    width: `${project.progress}%`,
                                    backgroundColor: projectStatus?.color || '#6366f1'
                                  }}
                                />
                                <span className="absolute left-2 text-[8px] font-black text-slate-800 dark:text-slate-100 pointer-events-none uppercase">
                                  {project.progress}%
                                </span>
                              </div>
                            )}
                          </div>

                          {project.milestones?.map((milestone) => {
                            const mPos = getTimelinePosition(milestone.date);
                            if (mPos === null) return null;
                            const isAchieved = !!milestone.completed;
                            return (
                              <div
                                key={milestone.id}
                                className="absolute top-0 z-40 group/milestone cursor-pointer hover:z-[200]"
                                style={{ left: `${mPos}%`, transform: 'translateX(-50%)' }}
                              >
                                <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] ${isAchieved ? 'border-t-emerald-500' : 'border-t-rose-600 dark:border-t-rose-500'} shadow-sm`}></div>

                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover/milestone:opacity-100 group-hover/milestone:visible transition-all duration-200 z-[250] min-w-[160px] pointer-events-none border border-slate-700 dark:border-slate-800">
                                  <div className="flex items-center gap-2 mb-1 border-b border-slate-700 dark:border-slate-800 pb-1">
                                    <Flag size={10} className={`${isAchieved ? 'text-emerald-500 fill-emerald-500' : 'text-rose-500 fill-rose-500'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Milestone</span>
                                  </div>
                                  <div className="text-[11px] font-bold text-white mb-0.5 leading-tight">{milestone.name}</div>
                                  <div className="text-[9px] text-slate-300 dark:text-slate-400 font-medium mb-1.5 leading-snug">{milestone.description || 'No description'}</div>
                                  <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-md inline-block uppercase tracking-wider border ${isAchieved ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20'}`}>
                                    {milestone.date}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {isExpanded && project.tasks?.map(task => {
                        const tStartPos = getTimelinePosition(task.startDate) || 0;
                        const tEndPos = getTimelinePosition(task.endDate) || 0;
                        const tBarWidth = Math.max(tEndPos - tStartPos, 0.5);

                        return (
                          <div key={task.id} className="flex border-b border-slate-100 dark:border-slate-800 relative transition-all">
                            <div
                              className="sticky left-0 flex-shrink-0 z-[150] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex items-center pl-8 pr-4 shadow-sm"
                              style={{ width: `${SIDEBAR_WIDTH}px`, height: `${TASK_ROW_HEIGHT}px` }}
                            >
                              <ListChecks size={10} className="text-slate-400 dark:text-slate-500 mr-2" />
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate">{task.name}</span>
                            </div>

                            <div className="flex-grow relative h-[32px]">
                              <div
                                className="absolute h-3.5 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-md overflow-hidden z-10 shadow-sm"
                                style={{ left: `${tStartPos}%`, width: `${tBarWidth}%`, top: '50%', transform: 'translateY(-50%)' }}
                              >
                                <div className="h-full bg-indigo-500/50 dark:bg-indigo-400/50" style={{ width: `${task.progress}%` }} />
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
