import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Maximize2, Minimize2, Search } from 'lucide-react';
import { db, collection, onSnapshot, query, where } from '../firebase';
import { MasterData, Project, WeeklyUpdate } from '../types';
import { formatDateTime, getCurrentWeekId, getNextWeekId, getPreviousWeekId, toIsoString } from '../utils/dateUtils';
import { getStatusCategory } from '../utils/statusCategory';
import { useRouteState } from '../utils/useRouteState';
import { DataTable, Drawer, EmptyState, PageHeader, Skeleton, StatusBadge } from './ui';

interface WeeklyReviewProps {
  projects: Project[];
  masterData: MasterData;
  onUpdateProgress: (project: Project, weekId?: string) => void;
}

interface WeeklyReviewState {
  weekId: string;
  view: 'active' | 'all';
  search: string;
}

const updateTime = (update?: WeeklyUpdate) => {
  if (!update) return 0;
  const time = new Date(update.updatedAt).getTime();
  return isNaN(time) ? 0 : time;
};

const WeeklyReview: React.FC<WeeklyReviewProps> = ({ projects, masterData, onUpdateProgress }) => {
  const [reviewState, setReviewState] = useRouteState<WeeklyReviewState>('weeklyReview', { weekId: getCurrentWeekId(), view: 'active', search: '' });
  const { weekId, view, search } = reviewState;
  const setWeekId = (value: string) => setReviewState(state => ({ ...state, weekId: value }));
  const setView = (value: 'active' | 'all') => setReviewState(state => ({ ...state, view: value }));
  const setSearch = (value: string) => setReviewState(state => ({ ...state, search: value }));
  const [reports, setReports] = useState<WeeklyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => {
    if (!presentationMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresentationMode(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [presentationMode]);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const reportsQuery = query(collection(db, 'weekly_updates'), where('weekId', '==', weekId));
    return onSnapshot(reportsQuery, snapshot => {
      setReports(snapshot.docs.map(document => {
        const record = document.data({ serverTimestamps: 'estimate' });
        return { ...record, id: document.id, updatedAt: toIsoString(record.updatedAt) } as WeeklyUpdate;
      }));
      setLoading(false);
    }, error => {
      console.error('Failed to load weekly review:', error);
      setLoadError(true);
      setLoading(false);
    });
  }, [weekId]);

  const latestByProject = useMemo(() => {
    const latest = new Map<string, WeeklyUpdate>();
    reports.forEach(report => {
      const previous = latest.get(report.projectId);
      if (!previous || updateTime(report) >= updateTime(previous)) latest.set(report.projectId, report);
    });
    return latest;
  }, [reports]);

  const activeProjects = projects.filter(project => getStatusCategory(project.status) === 'Active');
  const reportedCount = activeProjects.filter(project => latestByProject.has(project.id)).length;
  const baseProjects = view === 'active'
    ? activeProjects
    : projects;
  const visibleProjects = baseProjects.filter(project => {
    const searchText = search.trim().toLowerCase();
    return !searchText || [project.name, project.leader, project.department, project.ciNo || '']
      .some(value => value.toLowerCase().includes(searchText));
  });
  const statusColor = (status: string) => masterData.statuses.find(item => item.name === status)?.color;
  const reviewColumns = [
    { header: 'Project', className: 'max-w-80 px-4 py-3', render: (project: Project) => <><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{project.name}</span><span className="text-xs text-slate-500">{project.id}</span></> },
    { header: 'Leader', render: (project: Project) => <span className="text-sm text-slate-600 dark:text-slate-300">{project.leader}</span> },
    { header: 'Department', render: (project: Project) => <span className="text-sm text-slate-600 dark:text-slate-300">{project.department}</span> },
    { header: 'Status', render: (project: Project) => <StatusBadge label={project.status} color={statusColor(project.status)} /> },
    { header: 'Progress', className: 'whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200', render: (project: Project) => `${project.progress}%` },
    { header: 'Weekly report', className: 'whitespace-nowrap px-4 py-3 text-sm', render: (project: Project) => {
      const report = latestByProject.get(project.id);
      return report ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15} />Reported · {report.progress}%</span> : <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400"><AlertCircle size={15} />No update</span>;
    } }
  ];

  return (
    <div className={presentationMode
      ? 'fixed inset-0 z-[900] flex flex-col gap-6 overflow-hidden bg-slate-50 p-6 dark:bg-slate-950 lg:p-10'
      : 'flex h-full flex-col gap-5 overflow-hidden'}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader icon={CalendarDays} title="Weekly Review" description="Current-week reporting coverage and project updates" />
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/weekly" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Board</Link>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" aria-label="Project view">
            <button onClick={() => setView('active')} aria-pressed={view === 'active'} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-500'}`}>Active</button>
            <button onClick={() => setView('all')} aria-pressed={view === 'all'} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === 'all' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>All</button>
          </div>
          <button onClick={() => setPresentationMode(value => !value)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" title={presentationMode ? 'Exit presentation mode' : 'Enter presentation mode'} aria-label={presentationMode ? 'Exit presentation mode' : 'Enter presentation mode'}>
            {presentationMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active projects reported</p>
          {loading ? <Skeleton className="mt-2 h-8 w-32" /> : loadError ? (
            <p role="alert" className="mt-1 text-sm text-rose-600">Report coverage could not be loaded.</p>
          ) : (
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{reportedCount}/{activeProjects.length}<span className="ml-2 text-sm font-medium text-slate-500">{' '}reported</span></p>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button onClick={() => setWeekId(getPreviousWeekId(weekId))} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Previous week"><ChevronLeft size={18} /></button>
          <span className="min-w-32 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{weekId}</span>
          <button onClick={() => setWeekId(getNextWeekId(weekId))} disabled={weekId >= getCurrentWeekId()} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Next week"><ChevronRight size={18} /></button>
          {weekId !== getCurrentWeekId() && <button onClick={() => setWeekId(getCurrentWeekId())} className="border-l border-slate-200 px-3 py-2 text-xs font-semibold text-indigo-700 dark:border-slate-700 dark:text-indigo-300">Current</button>}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-52 flex-grow sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search projects..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        </div>
        <p className="text-xs text-slate-500">{visibleProjects.length} project{visibleProjects.length === 1 ? '' : 's'} in view</p>
      </div>

      <div className="custom-scrollbar flex-grow overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-3 p-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : loadError ? (
          <EmptyState icon={AlertCircle} title="Could not load weekly updates" description="Try again after checking the connection." />
        ) : visibleProjects.length === 0 ? (
          <EmptyState icon={Search} title="No projects match" description="Try changing the view or search term." />
        ) : (
          <DataTable<Project> rows={visibleProjects} columns={reviewColumns} getRowKey={project => project.id} onRowClick={setSelectedProject} label="Weekly project reporting" className="min-w-[720px]" />
        )}
      </div>

      <Drawer
        open={selectedProject !== null}
        title={selectedProject?.name || 'Project update'}
        onClose={() => setSelectedProject(null)}
        footer={selectedProject && <button onClick={() => onUpdateProgress(selectedProject, weekId)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{latestByProject.has(selectedProject.id) ? 'Edit weekly update' : 'Add weekly update'}</button>}
      >
        {selectedProject && (() => {
          const report = latestByProject.get(selectedProject.id);
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{selectedProject.id}</span><span>{selectedProject.leader}</span><span>{selectedProject.department}</span>
                <StatusBadge label={selectedProject.status} color={statusColor(selectedProject.status)} />
              </div>
              {report ? (
                <>
                  <div className="flex items-center justify-between border-y border-slate-200 py-3 dark:border-slate-800">
                    <span className="text-sm text-slate-500">{weekId} · {formatDateTime(report.updatedAt)}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{report.progress}%</span>
                  </div>
                  <div className="space-y-4">
                    <section><h3 className="mb-1 text-xs font-bold uppercase text-slate-500">Summary</h3><p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{report.summary || 'No summary provided.'}</p></section>
                    <section><h3 className="mb-1 text-xs font-bold uppercase text-rose-600">Issues</h3><p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{report.issues || 'No issues reported.'}</p></section>
                    <section><h3 className="mb-1 text-xs font-bold uppercase text-emerald-600">Next steps</h3><p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{report.nextSteps || 'No next steps provided.'}</p></section>
                  </div>
                </>
              ) : <EmptyState icon={AlertCircle} title="No update for this week" description="Post the project’s weekly progress to complete reporting." />}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
};

export default WeeklyReview;
