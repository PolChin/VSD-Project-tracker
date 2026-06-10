import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, collection, query, where, getDocs, onSnapshot } from '../firebase';
import { Project, WeeklyUpdate, MasterData } from '../types';
import { getCurrentWeekId, getPreviousWeekId, getNextWeekId, weekIdToDateRange } from '../utils/dateUtils';
import MultiSelectFilter from './MultiSelectFilter';
import { 
  Presentation, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Building2,
  User,
  Tag,
  RotateCcw,
  Filter
} from 'lucide-react';

interface WeeklyVisualboardProps {
  projects: Project[];
  masterData: MasterData;
  onUpdateProgress: (project: Project, weekId?: string) => void;
}

const WeeklyVisualboard: React.FC<WeeklyVisualboardProps> = ({ projects, masterData, onUpdateProgress }) => {
  const hasInitializedFilter = useRef(false);

  const formatUpdateDate = (dateValue: any) => {
    if (!dateValue) return '';
    let d: Date;
    if (dateValue && typeof dateValue.toDate === 'function') {
      d = dateValue.toDate();
    } else {
      d = new Date(dateValue);
    }
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const realCurrentWeek = useMemo(() => getCurrentWeekId(), []);
  const defaultWeek = useMemo(() => realCurrentWeek, [realCurrentWeek]);
  const [currentWeek, setCurrentWeek] = useState<string>(defaultWeek);
  const [updates, setUpdates] = useState<Record<string, Record<string, WeeklyUpdate>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string[]>(['All']);
  const [leaderFilter, setLeaderFilter] = useState<string[]>(['All']);
  const [statusFilter, setStatusFilter] = useState<string[]>(['All']);
  const [visualMode, setVisualMode] = useState<'single' | 'triple'>('triple');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const displayWeeks = useMemo(() => {
    if (visualMode === 'single') {
      return [currentWeek];
    }
    const w1 = currentWeek;
    const w2 = getPreviousWeekId(w1);
    const w3 = getPreviousWeekId(w2);
    return [w1, w2, w3];
  }, [currentWeek, visualMode]);

  // Set default status filter once masterData is available
  useEffect(() => {
    if (!hasInitializedFilter.current && masterData.statuses.length > 0) {
      const activeStatuses = masterData.statuses
        .map(s => s.name)
        .filter(name => name !== 'Pending' && name !== 'Completed');
      if (activeStatuses.length > 0) {
        setStatusFilter(activeStatuses);
      }
      hasInitializedFilter.current = true;
    }
  }, [masterData.statuses]);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'weekly_updates'), where('weekId', 'in', displayWeeks));
    const unsubscribe = onSnapshot(q, (snap) => {
      const updatesMap: Record<string, Record<string, WeeklyUpdate>> = {};
      snap.docs.forEach(doc => {
        const data = doc.data() as WeeklyUpdate;
        if (!updatesMap[data.projectId]) updatesMap[data.projectId] = {};
        updatesMap[data.projectId][data.weekId] = { ...data, id: doc.id };
      });
      setUpdates(updatesMap);
      setIsLoading(false);
    }, (err) => {
      console.error("Failed to fetch weekly updates:", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [displayWeeks]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.leader.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ciNo || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = deptFilter.includes('All') || deptFilter.includes(p.department);
      const matchLeader = leaderFilter.includes('All') || leaderFilter.includes(p.leader);
      const matchStatus = statusFilter.includes('All') || statusFilter.includes(p.status);

      return matchSearch && matchDept && matchLeader && matchStatus;
    });
  }, [projects, searchQuery, deptFilter, leaderFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setDeptFilter(['All']);
    setLeaderFilter(['All']);
    setStatusFilter(['All']);
  };

  const currentWeekRange = useMemo(() => {
    const { start, end } = weekIdToDateRange(currentWeek);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}`;
  }, [currentWeek]);

  const renderUpdateCard = (project: Project, weekId: string, update?: WeeklyUpdate) => {
    if (!update) {
      return (
        <div
          onClick={() => onUpdateProgress(project, weekId)}
          className="h-full min-h-[120px] flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex flex-col items-center gap-2">
            <Clock size={16} className="opacity-50" />
            No Update
          </span>
        </div>
      );
    }

    const statusColor = masterData.statuses.find(s => s.name === update.status)?.color || '#94a3b8';
    const cardKey = `${project.id}-${weekId}`;
    const isExpanded = !!expandedCards[cardKey];
    
    const summaryThreshold = 90;
    const issuesThreshold = 75;
    const nextStepsThreshold = 75;
    
    const hasLongText = 
      (update.summary && update.summary.length > summaryThreshold) ||
      (update.issues && update.issues.length > issuesThreshold) ||
      (update.nextSteps && update.nextSteps.length > nextStepsThreshold);

    const renderTextContent = (text: string, threshold: number, icon: React.ReactNode, textClass: string) => {
      const isLong = text.length > threshold;
      const showFull = isExpanded || !isLong;
      const displayText = showFull ? text : `${text.slice(0, threshold)}...`;
      return (
        <div className={textClass}>
          {icon}
          {displayText}
        </div>
      );
    };

    return (
      <div
        onClick={() => onUpdateProgress(project, update.weekId)}
        className="h-full flex flex-col bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:shadow-md min-h-[120px]"
      >
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: statusColor }} />

        <div className="flex justify-between items-center mb-2 pl-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" style={{ color: statusColor }}>{update.status}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{formatUpdateDate(update.updatedAt)}</span>
          </div>
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">{update.progress}%</span>
        </div>

        <div className="flex-grow space-y-2 mt-1 pl-2 pb-1 text-left">
          {update.summary && renderTextContent(
            update.summary,
            summaryThreshold,
            <FileText size={10} className="inline mr-1 opacity-50 mb-0.5" />,
            "text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line"
          )}
          
          {(update.issues || update.nextSteps) && (
            <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
              {update.issues && renderTextContent(
                update.issues,
                issuesThreshold,
                <AlertCircle size={9} className="inline mr-1 text-rose-500 mb-0.5" />,
                "text-[9px] text-rose-700 dark:text-rose-400 font-bold leading-snug whitespace-pre-line"
              )}
              {update.nextSteps && renderTextContent(
                update.nextSteps,
                nextStepsThreshold,
                <CheckCircle2 size={9} className="inline mr-1 text-emerald-500 mb-0.5" />,
                "text-[9px] text-emerald-700 dark:text-emerald-400 font-bold leading-snug whitespace-pre-line"
              )}
            </div>
          )}

          {hasLongText && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/50 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCards(prev => ({
                    ...prev,
                    [cardKey]: !isExpanded
                  }));
                }}
                className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-0.5"
              >
                {isExpanded ? 'Show Less ▲' : 'Show More ▼'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isFilterActive = searchQuery !== '' || !deptFilter.includes('All') || !leaderFilter.includes('All') || !statusFilter.includes('All');

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-hidden">
      {/* Header & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-center gap-4 shadow-sm border border-slate-200 dark:border-slate-800 relative z-50">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex-shrink-0">
            <Presentation size={24} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Weekly Visualboard</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Historical Progress View</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setVisualMode('triple')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                visualMode === 'triple'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              3 Weeks
            </button>
            <button
              onClick={() => setVisualMode('single')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                visualMode === 'single'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Single Week
            </button>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setCurrentWeek(getPreviousWeekId(currentWeek))}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 flex flex-col items-center justify-center min-w-[120px]">
              <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{currentWeek}</span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{currentWeekRange}</span>
            </div>
            <button
              onClick={() => setCurrentWeek(getNextWeekId(currentWeek))}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
            >
              <ChevronRight size={16} />
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-2" />
            <button
              onClick={() => setCurrentWeek(getCurrentWeekId())}
              className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Filters Suite - NOW BEFORE SEARCH */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <MultiSelectFilter
              label="Dept"
              options={['All', ...masterData.departments]}
              selectedValues={deptFilter}
              onChange={setDeptFilter}
              className="w-[100px] flex-shrink-0"
            />
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <MultiSelectFilter
              label="Leader"
              options={['All', ...masterData.leaders]}
              selectedValues={leaderFilter}
              onChange={setLeaderFilter}
              className="w-[100px] flex-shrink-0"
            />
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <MultiSelectFilter
              label="Status"
              options={['All', ...masterData.statuses.map(s => s.name)]}
              selectedValues={statusFilter}
              onChange={setStatusFilter}
              className="w-[100px] flex-shrink-0"
            />
          </div>

          {/* Search Input */}
          <div className="relative flex-grow max-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
            />
          </div>

          {isFilterActive && (
            <button
              onClick={clearFilters}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
              title="Clear Filters"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Board List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-10 flex-grow overflow-hidden mb-2">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Weekly Data...</span>
          </div>
        ) : (
          <div className="h-full overflow-auto relative rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white dark:bg-slate-900 custom-scrollbar">
            <table className={`w-full text-left border-collapse ${visualMode === 'single' ? 'min-w-[800px]' : 'min-w-[1000px]'} table-fixed`}>
              <thead className="sticky top-0 z-30 bg-white dark:bg-slate-900 shadow-sm">
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4 w-[280px]">Project Name</th>
                  <th className="px-4 py-4 w-[110px]">Leader</th>
                  <th className="px-4 py-4 w-[90px]">Dept</th>
                  <th className="px-4 py-4 w-[100px] text-center">Status</th>
                  <th className="px-4 py-4 w-[50px] text-right">%</th>
                  {displayWeeks.map((week, idx) => {
                    const { start, end } = weekIdToDateRange(week);
                    const rangeStr = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
                    const isLatestReportWeek = week === defaultWeek;

                    return (
                      <th key={week} className={`px-4 py-4 ${visualMode === 'single' ? 'w-auto' : 'w-[310px]'} text-center border-l border-slate-200 dark:border-slate-800/50`}>
                        <div className="flex flex-col items-center">
                          <span className="text-slate-700 dark:text-slate-300">
                            {week} {isLatestReportWeek ? <span className="text-indigo-500">(Latest)</span> : ''}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{rangeStr}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-4 py-4 whitespace-nowrap text-center border-l border-slate-200 dark:border-slate-800/50 w-[70px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProjects.map((project) => {
                  const projectUpdates = updates[project.id] || {};

                  return (
                    <tr key={project.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors align-top">
                      {/* Project Name */}
                      <td className="px-6 py-5">
                        <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug whitespace-normal" title={project.name}>{project.name}</h4>
                        {project.ciNo && (
                          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-1">
                            CI No: {project.ciNo}
                          </div>
                        )}
                      </td>

                      {/* Leader */}
                      <td className="px-4 py-5">
                        <div className="flex items-center">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate">{project.leader}</span>
                        </div>
                      </td>

                      {/* Dept */}
                      <td className="px-4 py-5">
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{project.department}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-5 text-center">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white shadow-sm"
                          style={{ backgroundColor: masterData.statuses.find(s => s.name === project.status)?.color || '#94a3b8' }}
                        >
                          {project.status}
                        </span>
                      </td>

                      {/* Progress % */}
                      <td className="px-4 py-5 text-right">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{project.progress}%</span>
                      </td>

                      {/* History Columns */}
                      {displayWeeks.map(week => (
                        <td key={`${project.id}-${week}`} className="p-2 border-l border-slate-100 dark:border-slate-800/50 h-full">
                          {renderUpdateCard(project, week, projectUpdates[week])}
                        </td>
                      ))}

                      {/* Actions */}
                      <td className="px-4 py-5 text-center align-middle border-l border-slate-100 dark:border-slate-800/50">
                        <button
                          onClick={() => onUpdateProgress(project)}
                          className="flex flex-col items-center justify-center w-full gap-1 p-2 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                          title="Update Progress"
                        >
                          <Presentation size={18} />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Update</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={5 + displayWeeks.length + 1} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                          <Filter size={32} />
                        </div>
                        <p className="text-slate-500 font-medium">No projects match the current filters.</p>
                        <button 
                          onClick={clearFilters}
                          className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-widest hover:underline"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyVisualboard;
