import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Edit3, FileText, Flag, History, ListChecks, Presentation, SearchX } from 'lucide-react';
import { db, collection, query, where, onSnapshot } from '../firebase';
import { MasterData, Milestone, Project, Task, WeeklyUpdate } from '../types';
import { formatDateOnly, formatDateTime, toIsoString, toLocalDateInputValue, weekIdToDateRange } from '../utils/dateUtils';
import { isDoneStatus } from '../utils/statusCategory';
import { EmptyState, ProgressBar, Skeleton, StatusBadge } from './ui';

export type ProjectDetailTab = 'overview' | 'plan' | 'updates' | 'history';

export const projectDetailTabs: { id: ProjectDetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'updates', label: 'Weekly updates' },
  { id: 'history', label: 'History' }
];

interface ProjectDetailProps {
  projectId: string;
  project?: Project;
  tab: ProjectDetailTab;
  masterData: MasterData;
  onEdit: (project: Project) => void;
  onUpdateProgress: (project: Project, weekId?: string) => void;
}

interface HistoryEntry {
  id: string;
  updatedAt: string;
  name: string;
  leader: string;
  department: string;
  status: string;
  progress: number;
  ciNo: string;
  description: string;
  tasks: Task[];
  milestones: Milestone[];
}

interface WeekGroup {
  weekId: string;
  latest: WeeklyUpdate;
  revisions: number;
}

const timeOf = (iso: string) => {
  const time = new Date(iso).getTime();
  return isNaN(time) ? 0 : time;
};

const describeChanges = (current: HistoryEntry, previous?: HistoryEntry): string[] => {
  if (!previous) return ['First recorded version'];
  const changes: string[] = [];
  const fields: [keyof HistoryEntry, string][] = [
    ['name', 'Name'], ['status', 'Status'], ['leader', 'Leader'], ['department', 'Department'], ['ciNo', 'CI No.']
  ];
  fields.forEach(([key, label]) => {
    if (current[key] !== previous[key]) changes.push(`${label}: ${previous[key] || '—'} → ${current[key] || '—'}`);
  });
  if (current.progress !== previous.progress) changes.push(`Progress: ${previous.progress}% → ${current.progress}%`);
  if (current.description !== previous.description) changes.push('Description updated');

  const previousTasks = new Map(previous.tasks.map(task => [task.id, task]));
  current.tasks.forEach(task => {
    const before = previousTasks.get(task.id);
    if (!before) {
      changes.push(`Task added: ${task.name || 'Untitled task'}`);
      return;
    }
    if (before.startDate !== task.startDate) changes.push(`Task "${task.name}" start: ${formatDateOnly(before.startDate)} → ${formatDateOnly(task.startDate)}`);
    if (before.endDate !== task.endDate) changes.push(`Task "${task.name}" end: ${formatDateOnly(before.endDate)} → ${formatDateOnly(task.endDate)}`);
    if (before.progress !== task.progress) changes.push(`Task "${task.name}" progress: ${before.progress}% → ${task.progress}%`);
  });
  previous.tasks.forEach(task => {
    if (!current.tasks.some(item => item.id === task.id)) changes.push(`Task removed: ${task.name || 'Untitled task'}`);
  });

  const previousMilestones = new Map(previous.milestones.map(milestone => [milestone.id, milestone]));
  current.milestones.forEach(milestone => {
    const before = previousMilestones.get(milestone.id);
    if (!before) {
      changes.push(`Milestone added: ${milestone.name || 'Untitled milestone'}`);
      return;
    }
    if (before.date !== milestone.date) changes.push(`Milestone "${milestone.name}" date: ${formatDateOnly(before.date)} → ${formatDateOnly(milestone.date)}`);
    if (!!before.completed !== !!milestone.completed) changes.push(`Milestone "${milestone.name}" ${milestone.completed ? 'achieved' : 'reopened'}`);
  });
  previous.milestones.forEach(milestone => {
    if (!current.milestones.some(item => item.id === milestone.id)) changes.push(`Milestone removed: ${milestone.name || 'Untitled milestone'}`);
  });

  return changes.length > 0 ? changes : ['Saved with no field changes'];
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
    {children}
  </section>
);

const UpdateText: React.FC<{ update: WeeklyUpdate }> = ({ update }) => (
  <div className="space-y-2 text-sm">
    {update.summary && <p className="whitespace-pre-line text-slate-700 dark:text-slate-300"><FileText size={13} className="mr-1 inline opacity-50" />{update.summary}</p>}
    {update.issues && <p className="whitespace-pre-line text-rose-700 dark:text-rose-400"><AlertCircle size={13} className="mr-1 inline" />{update.issues}</p>}
    {update.nextSteps && <p className="whitespace-pre-line text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={13} className="mr-1 inline" />{update.nextSteps}</p>}
    {!update.summary && !update.issues && !update.nextSteps && <p className="text-slate-400">No notes recorded.</p>}
  </div>
);

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, project, tab, masterData, onEdit, onUpdateProgress }) => {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(true);
  const [updatesError, setUpdatesError] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    setUpdatesLoading(true);
    setUpdatesError(false);
    const updatesQuery = query(collection(db, 'weekly_updates'), where('projectId', '==', projectId));
    return onSnapshot(updatesQuery, snapshot => {
      setUpdates(snapshot.docs.map(item => {
        const record = item.data({ serverTimestamps: 'estimate' });
        return { ...record, id: item.id, updatedAt: toIsoString(record.updatedAt) } as WeeklyUpdate;
      }));
      setUpdatesLoading(false);
    }, error => {
      console.error('Failed to load weekly updates:', error);
      setUpdatesError(true);
      setUpdatesLoading(false);
    });
  }, [projectId]);

  useEffect(() => {
    if (tab !== 'history') return;
    setHistory(null);
    setHistoryError(false);
    // No orderBy: legacy string and new Timestamp values cannot be ordered together server-side.
    const historyQuery = query(collection(db, 'projects_history'), where('projectId', '==', projectId));
    return onSnapshot(historyQuery, snapshot => {
      const entries = snapshot.docs.map(item => {
        const record = item.data({ serverTimestamps: 'estimate' });
        return {
          id: item.id,
          updatedAt: toIsoString(record.updatedAt),
          name: String(record.name || ''),
          leader: String(record.leader || ''),
          department: String(record.department || ''),
          status: String(record.status || ''),
          progress: Number(record.progress || 0),
          ciNo: String(record.ciNo || ''),
          description: String(record.description || ''),
          tasks: Array.isArray(record.tasks) ? record.tasks : [],
          milestones: Array.isArray(record.milestones) ? record.milestones : []
        };
      });
      entries.sort((a, b) => timeOf(b.updatedAt) - timeOf(a.updatedAt));
      setHistory(entries);
    }, error => {
      console.error('Failed to load project history:', error);
      setHistoryError(true);
    });
  }, [projectId, tab]);

  const weekGroups = useMemo(() => {
    const groups = new Map<string, WeekGroup>();
    updates.forEach(update => {
      if (!update.weekId) return;
      const group = groups.get(update.weekId);
      if (!group) {
        groups.set(update.weekId, { weekId: update.weekId, latest: update, revisions: 1 });
        return;
      }
      group.revisions += 1;
      if (timeOf(update.updatedAt) > timeOf(group.latest.updatedAt)) group.latest = update;
    });
    return [...groups.values()].sort((a, b) => weekIdToDateRange(b.weekId).start.getTime() - weekIdToDateRange(a.weekId).start.getTime());
  }, [updates]);

  if (!project) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <EmptyState icon={SearchX} title="Project not found" description="It may have been deleted, or the link is incorrect." />
        <div className="pb-10 text-center">
          <Link to="/portfolio" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Back to projects</Link>
        </div>
      </div>
    );
  }

  const statusColorOf = (status: string) => masterData.statuses.find(item => item.name === status)?.color;
  const today = toLocalDateInputValue();
  const projectDone = isDoneStatus(project.status);
  const isTaskOverdue = (task: Task) => !projectDone && task.progress < 100 && task.endDate < today;
  const isMilestoneOverdue = (milestone: Milestone) => !projectDone && !milestone.completed && milestone.date < today;
  const tasks = [...project.tasks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const milestones = [...(project.milestones || [])].sort((a, b) => a.date.localeCompare(b.date));
  const completedMilestones = milestones.filter(milestone => milestone.completed).length;
  const overdueMilestones = milestones.filter(isMilestoneOverdue);
  const nextMilestone = milestones.find(milestone => !milestone.completed && milestone.date >= today);
  const overdueTasks = tasks.filter(isTaskOverdue);
  const latestWeek = weekGroups[0];
  const handleBack = () => {
    const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) navigate(-1);
    else navigate('/portfolio', { replace: true });
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title="Progress">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{project.progress}%</p>
        <ProgressBar value={project.progress} color={statusColorOf(project.status)} className="mt-3 h-2" />
      </Card>
      <Card title="Milestones">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{completedMilestones}/{milestones.length}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {nextMilestone ? <>Next: {nextMilestone.name || 'Untitled milestone'} · {formatDateOnly(nextMilestone.date)}</> : 'No upcoming milestone'}
        </p>
        {overdueMilestones.length > 0 && <p className="mt-1 text-sm font-semibold text-rose-600">{overdueMilestones.length} overdue</p>}
      </Card>
      <Card title="Tasks">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{tasks.length}</p>
        <p className={`mt-2 text-sm ${overdueTasks.length > 0 ? 'font-semibold text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>
          {overdueTasks.length > 0 ? `${overdueTasks.length} past end date and not complete` : 'No overdue tasks'}
        </p>
      </Card>
      <Card title="Description" className="lg:col-span-3">
        <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{project.description || 'No description.'}</p>
      </Card>
      <Card title="Latest weekly update" className="lg:col-span-3">
        {updatesLoading ? <Skeleton className="h-16 w-full" /> : latestWeek ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{latestWeek.weekId}</span>
              <StatusBadge label={latestWeek.latest.status} color={statusColorOf(latestWeek.latest.status)} />
              <span>{latestWeek.latest.progress}%</span>
              <span>· {formatDateTime(latestWeek.latest.updatedAt)}</span>
            </div>
            <UpdateText update={latestWeek.latest} />
          </>
        ) : <p className="text-sm text-slate-500">No weekly update yet.</p>}
      </Card>
    </div>
  );

  const renderPlan = () => (
    <div className="space-y-4">
      <Card title={`Tasks (${tasks.length})`}>
        {tasks.length === 0 ? <p className="text-sm text-slate-500">No tasks planned.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-4 font-semibold">Task</th>
                  <th className="py-2 pr-4 font-semibold">Start</th>
                  <th className="py-2 pr-4 font-semibold">End</th>
                  <th className="w-40 py-2 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.map(task => {
                  const overdue = isTaskOverdue(task);
                  return (
                    <tr key={task.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{task.name || 'Untitled task'}</p>
                        {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-600 dark:text-slate-300">{formatDateOnly(task.startDate)}</td>
                      <td className={`whitespace-nowrap py-3 pr-4 ${overdue ? 'font-semibold text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>{formatDateOnly(task.endDate)}{overdue && ' · overdue'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={task.progress} />
                          <span className="w-10 text-right text-xs font-semibold">{task.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title={`Milestones (${milestones.length})`}>
        {milestones.length === 0 ? <p className="text-sm text-slate-500">No milestones.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {milestones.map(milestone => {
              const overdue = isMilestoneOverdue(milestone);
              return (
                <li key={milestone.id} className="flex items-start gap-3 py-3">
                  <Flag size={16} className={`mt-0.5 flex-shrink-0 ${milestone.completed ? 'text-emerald-500' : overdue ? 'text-rose-500' : 'text-slate-400'}`} />
                  <div className="flex-grow">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{milestone.name || 'Untitled milestone'}</p>
                    {milestone.description && <p className="text-xs text-slate-500">{milestone.description}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-slate-600 dark:text-slate-300">{formatDateOnly(milestone.date)}</p>
                    <p className={`text-xs font-semibold ${milestone.completed ? 'text-emerald-600' : overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                      {milestone.completed ? 'Achieved' : overdue ? 'Overdue' : 'Planned'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );

  const renderUpdates = () => {
    if (updatesLoading) return <Skeleton className="h-40 w-full" />;
    if (updatesError) return <p className="text-sm text-rose-600">Weekly updates could not be loaded.</p>;
    if (weekGroups.length === 0) return <EmptyState icon={Presentation} title="No weekly updates yet" description="Use “Update progress” to post the first one." />;
    return (
      <div className="space-y-3">
        {weekGroups.map(group => {
          const { start, end } = weekIdToDateRange(group.weekId);
          const range = `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
          return (
            <button
              key={group.weekId}
              onClick={() => onUpdateProgress(project, group.weekId)}
              className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">{group.weekId}</span>
                <span className="text-slate-500">{range}</span>
                <StatusBadge label={group.latest.status} color={statusColorOf(group.latest.status)} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{group.latest.progress}%</span>
                <span className="ml-auto text-xs text-slate-500">
                  {formatDateTime(group.latest.updatedAt)}
                  {group.revisions > 1 && ` · Edited ${group.revisions - 1} time${group.revisions > 2 ? 's' : ''}`}
                </span>
              </div>
              <UpdateText update={group.latest} />
            </button>
          );
        })}
      </div>
    );
  };

  const renderHistory = () => {
    if (historyError) return <p className="text-sm text-rose-600">History could not be loaded.</p>;
    if (!history) return <Skeleton className="h-40 w-full" />;
    if (history.length === 0) return <EmptyState icon={History} title="No history recorded" description="History is recorded each time the project is saved." />;
    return (
      <ol className="space-y-3">
        {history.map((entry, index) => (
          <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">{formatDateTime(entry.updatedAt)}</span>
              <StatusBadge label={entry.status || 'Unknown'} color={statusColorOf(entry.status)} />
              <span className="text-slate-600 dark:text-slate-300">{entry.progress}%</span>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
              {describeChanges(entry, history[index + 1]).map(change => <li key={change}>{change}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button onClick={handleBack} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
          <ArrowLeft size={16} /> Projects
        </button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
              <StatusBadge label={project.status} color={statusColorOf(project.status)} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {project.id}{project.ciNo && ` · CI ${project.ciNo}`} · {project.leader} · {project.department} · Updated {formatDateTime(project.updatedAt)}
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button onClick={() => onUpdateProgress(project)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <Presentation size={16} /> Update progress
            </button>
            <button onClick={() => onEdit(project)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <Edit3 size={16} /> Edit
            </button>
          </div>
        </div>
        <nav className="custom-scrollbar mt-5 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-slate-200 dark:border-slate-800" aria-label="Project sections">
          {projectDetailTabs.map(item => (
            <Link
              key={item.id}
              to={`/projects/${encodeURIComponent(project.id)}/${item.id}`}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`-mb-px flex-shrink-0 border-b-2 px-3 py-2 text-sm font-semibold sm:px-4 ${tab === item.id ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {item.id === 'plan' && <ListChecks size={14} className="mr-1 inline" />}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="custom-scrollbar flex-grow overflow-y-auto pb-4">
        {tab === 'overview' && renderOverview()}
        {tab === 'plan' && renderPlan()}
        {tab === 'updates' && renderUpdates()}
        {tab === 'history' && renderHistory()}
      </div>
    </div>
  );
};

export default ProjectDetail;
