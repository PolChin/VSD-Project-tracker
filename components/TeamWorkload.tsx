import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MasterData, Project } from '../types';
import { getStatusCategory } from '../utils/statusCategory';
import { useRouteState } from '../utils/useRouteState';
import { EmptyState, FilterBar, PageHeader, ProgressBar, StatusBadge } from './ui';

interface TeamWorkloadProps {
  projects: Project[];
  masterData: MasterData;
}

interface LeaderGroup {
  name: string;
  projects: Project[];
  active: number;
  delayed: number;
  pipeline: number;
  done: number;
}

interface TeamWorkloadState {
  department: string;
  search: string;
  expanded: Record<string, boolean>;
}

const TeamWorkload: React.FC<TeamWorkloadProps> = ({ projects, masterData }) => {
  const [viewState, setViewState] = useRouteState<TeamWorkloadState>('teamWorkload', { department: 'All', search: '', expanded: {} });
  const { department, search, expanded } = viewState;
  const setDepartment = (value: string) => setViewState(state => ({ ...state, department: value }));
  const setSearch = (value: string) => setViewState(state => ({ ...state, search: value }));
  const setExpanded = (value: (current: Record<string, boolean>) => Record<string, boolean>) => setViewState(state => ({ ...state, expanded: value(state.expanded) }));
  const statusColor = (status: string) => masterData.statuses.find(item => item.name === status)?.color;

  const groups = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    const filtered = projects.filter(project => {
      const matchesDepartment = department === 'All' || project.department === department;
      const matchesSearch = !queryText || [project.name, project.leader, project.department, project.ciNo || '']
        .some(value => value.toLowerCase().includes(queryText));
      return matchesDepartment && matchesSearch;
    });
    const byLeader = new Map<string, Project[]>();
    filtered.forEach(project => {
      const leader = project.leader?.trim() || 'Unassigned';
      byLeader.set(leader, [...(byLeader.get(leader) || []), project]);
    });

    return [...byLeader.entries()]
      .map(([name, leaderProjects]): LeaderGroup => ({
        name,
        projects: leaderProjects.sort((a, b) => a.name.localeCompare(b.name)),
        active: leaderProjects.filter(project => getStatusCategory(project.status) === 'Active').length,
        delayed: leaderProjects.filter(project => getStatusCategory(project.status) === 'Delayed').length,
        pipeline: leaderProjects.filter(project => getStatusCategory(project.status) === 'Pipeline').length,
        done: leaderProjects.filter(project => getStatusCategory(project.status) === 'Done').length
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, department, search]);

  const visibleProjectCount = groups.reduce((sum, group) => sum + group.projects.length, 0);

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader icon={Users} title="Team Workload" description="Project distribution by leader" />
        <FilterBar className="sm:flex-nowrap">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search projects or leaders..."
            className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <select value={department} onChange={event => setDepartment(event.target.value)} aria-label="Filter by department" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <option value="All">All departments</option>
            {masterData.departments.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </FilterBar>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-y border-slate-200 py-3 text-sm dark:border-slate-800">
        <p className="text-slate-500">{visibleProjectCount} projects across {groups.length} leaders</p>
        <p className="text-xs text-slate-500">Leaders are listed alphabetically.</p>
      </div>

      <div className="custom-scrollbar flex-grow overflow-y-auto">
        {groups.length === 0 ? <EmptyState icon={Users} title="No matching projects" description="Try another search or department." /> : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {groups.map(group => {
              const isExpanded = !!expanded[group.name];
              return (
                <section key={group.name}>
                  <button
                    onClick={() => setExpanded(current => ({ ...current, [group.name]: !current[group.name] }))}
                    aria-expanded={isExpanded}
                    className="grid w-full grid-cols-[auto_minmax(0,1.5fr)_repeat(4,minmax(3.5rem,0.6fr))_auto] items-center gap-3 px-3 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/70"
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{group.name}</span>
                    <span className="text-center text-xs text-slate-500"><span className="block font-semibold text-slate-800 dark:text-slate-200">{group.active}</span>Active</span>
                    <span className="text-center text-xs text-slate-500"><span className="block font-semibold text-rose-700 dark:text-rose-400">{group.delayed}</span>Delayed</span>
                    <span className="text-center text-xs text-slate-500"><span className="block font-semibold text-slate-800 dark:text-slate-200">{group.pipeline}</span>Pipeline</span>
                    <span className="text-center text-xs text-slate-500"><span className="block font-semibold text-slate-800 dark:text-slate-200">{group.done}</span>Done</span>
                    <span className="whitespace-nowrap text-xs text-slate-500">{group.projects.length} projects</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 pl-7 dark:border-slate-800 dark:bg-slate-950/40">
                      {group.projects.map(project => (
                        <Link key={project.id} to={`/projects/${encodeURIComponent(project.id)}`} className="grid grid-cols-[minmax(0,1.5fr)_minmax(6rem,0.6fr)_minmax(7rem,0.7fr)] items-center gap-4 border-b border-slate-100 px-3 py-3 last:border-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{project.name}</span>
                            <span className="text-xs text-slate-500">{project.department}{project.ciNo ? ` · CI ${project.ciNo}` : ''}</span>
                          </span>
                          <StatusBadge label={project.status} color={statusColor(project.status)} />
                          <span className="flex items-center gap-2">
                            <ProgressBar value={project.progress} color={statusColor(project.status)} className="h-1.5" />
                            <span className="w-10 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{project.progress}%</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamWorkload;
