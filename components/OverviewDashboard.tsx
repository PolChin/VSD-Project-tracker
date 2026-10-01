import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Layers3, type LucideIcon } from 'lucide-react';
import { db, collection, onSnapshot, query, where } from '../firebase';
import { MasterData, Project } from '../types';
import { getCurrentWeekId, toLocalDateInputValue } from '../utils/dateUtils';
import { getStatusCategory, StatusCategory } from '../utils/statusCategory';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from './ui';

interface OverviewDashboardProps {
  projects: Project[];
  masterData: MasterData;
}

interface WeeklyReport {
  projectId: string;
  weekId: string;
  updatedAt: unknown;
}

const categoryCards: { category: Exclude<StatusCategory, 'Other'>; icon: LucideIcon; tone: string }[] = [
  { category: 'Active', icon: Layers3, tone: 'text-emerald-700 dark:text-emerald-400' },
  { category: 'Delayed', icon: AlertTriangle, tone: 'text-rose-700 dark:text-rose-400' },
  { category: 'Pipeline', icon: Clock3, tone: 'text-amber-700 dark:text-amber-400' },
  { category: 'Done', icon: CheckCircle2, tone: 'text-sky-700 dark:text-sky-400' }
];

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ projects, masterData }) => {
  const weekId = getCurrentWeekId();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState(false);

  useEffect(() => {
    setReportsLoading(true);
    setReportsError(false);
    const reportsQuery = query(collection(db, 'weekly_updates'), where('weekId', '==', weekId));
    return onSnapshot(reportsQuery, snapshot => {
      setReports(snapshot.docs.map(document => {
        const data = document.data();
        return { projectId: String(data.projectId || ''), weekId: String(data.weekId || ''), updatedAt: data.updatedAt };
      }));
      setReportsLoading(false);
    }, error => {
      console.error('Failed to load current-week coverage:', error);
      setReportsError(true);
      setReportsLoading(false);
    });
  }, [weekId]);

  const reportsByProject = useMemo(() => {
    const latest = new Map<string, number>();
    reports.forEach(report => {
      const updatedAt = report.updatedAt && typeof (report.updatedAt as { toDate?: unknown }).toDate === 'function'
        ? (report.updatedAt as { toDate: () => Date }).toDate().getTime()
        : new Date(report.updatedAt as string).getTime();
      latest.set(report.projectId, Math.max(latest.get(report.projectId) || 0, isNaN(updatedAt) ? 0 : updatedAt));
    });
    return latest;
  }, [reports]);

  const activeProjects = projects.filter(project => getStatusCategory(project.status) === 'Active');
  const notReported = activeProjects
    .filter(project => !reportsByProject.has(project.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const delayedProjects = projects
    .filter(project => getStatusCategory(project.status) === 'Delayed')
    .sort((a, b) => a.name.localeCompare(b.name));

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);
  const today = toLocalDateInputValue();
  const throughDate = toLocalDateInputValue(endDate);
  const upcomingMilestones = projects.flatMap(project => (project.milestones || [])
    .filter(milestone => !milestone.completed && milestone.date >= today && milestone.date <= throughDate)
    .map(milestone => ({ project, milestone })))
    .sort((a, b) => a.milestone.date.localeCompare(b.milestone.date));

  const countByCategory = (category: StatusCategory) => projects.filter(project => getStatusCategory(project.status) === category).length;
  const reportedActiveCount = activeProjects.filter(project => reportsByProject.has(project.id)).length;
  const statusColor = (status: string) => masterData.statuses.find(item => item.name === status)?.color;

  const ProjectLink: React.FC<{ project: Project }> = ({ project }) => (
    <Link to={`/projects/${encodeURIComponent(project.id)}`} className="block rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{project.name}</span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span>{project.leader}</span>
        <span>{project.department}</span>
        <StatusBadge label={project.status} color={statusColor(project.status)} />
      </span>
    </Link>
  );

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <PageHeader icon={Layers3} title="Overview" description="Project status, weekly reporting and upcoming milestones" />
      <div className="custom-scrollbar flex-grow space-y-5 overflow-y-auto pb-4">
        <section aria-label="Project status summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {categoryCards.map(({ category, icon: Icon, tone }) => (
            <div key={category} className="flex items-center gap-3 border-b border-slate-200 py-4 dark:border-slate-800">
              <Icon size={19} className={tone} />
              <div>
                <p className="text-xs font-semibold text-slate-500">{category}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{countByCategory(category)}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="border-t-2 border-emerald-600 pt-4 dark:border-emerald-500">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Weekly reporting</h2>
                <p className="text-sm text-slate-500">Active projects · {weekId}</p>
              </div>
              {reportsLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="whitespace-nowrap text-lg font-bold text-slate-900 dark:text-white">
                  {reportsError ? '—' : `${reportedActiveCount}/${activeProjects.length}`}
                  <span className="ml-1 text-xs font-medium text-slate-500">{' '}reported</span>
                </p>
              )}
            </div>
            {reportsError ? <p role="alert" className="text-sm text-rose-600">Weekly reporting data could not be loaded.</p> : reportsLoading ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : notReported.length === 0 ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">All active projects have reported this week.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notReported.slice(0, 6).map(project => <ProjectLink key={project.id} project={project} />)}
                {notReported.length > 6 && <p className="px-3 py-2 text-xs text-slate-500">And {notReported.length - 6} more projects without an update.</p>}
              </div>
            )}
          </div>

          <div className="border-t-2 border-rose-600 pt-4 dark:border-rose-500">
            <div className="mb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Delayed projects</h2>
              <p className="text-sm text-slate-500">{delayedProjects.length} project{delayedProjects.length === 1 ? '' : 's'}</p>
            </div>
            {delayedProjects.length === 0 ? <p className="text-sm text-slate-500">No delayed projects.</p> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {delayedProjects.slice(0, 6).map(project => <ProjectLink key={project.id} project={project} />)}
                {delayedProjects.length > 6 && <p className="px-3 py-2 text-xs text-slate-500">And {delayedProjects.length - 6} more delayed projects.</p>}
              </div>
            )}
          </div>
        </section>

        <section className="border-t-2 border-sky-600 pt-4 dark:border-sky-500">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Milestones due in 14 days</h2>
              <p className="text-sm text-slate-500">Upcoming, incomplete milestones</p>
            </div>
            <CalendarClock size={18} className="text-sky-700 dark:text-sky-400" />
          </div>
          {upcomingMilestones.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No milestones due soon" description="No incomplete milestones fall within the next 14 days." />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingMilestones.slice(0, 8).map(({ project, milestone }) => (
                <Link key={`${project.id}-${milestone.id}`} to={`/projects/${encodeURIComponent(project.id)}/plan`} className="flex items-center justify-between gap-4 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{milestone.name || 'Untitled milestone'}</span>
                    <span className="block truncate text-xs text-slate-500">{project.name}</span>
                  </span>
                  <span className="flex-shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">{new Date(`${milestone.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OverviewDashboard;
