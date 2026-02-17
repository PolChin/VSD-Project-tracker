
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, MasterData } from '../types';
import { User, Building2, PlusCircle, Edit3, Info, Search, Filter, XCircle, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProjectListProps {
  projects: Project[];
  masterData: MasterData;
  onAddNew: () => void;
  onEditProject: (project: Project) => void;
}

type SortConfig = {
  key: 'name' | 'description' | 'leader' | 'department' | 'status' | 'progress';
  direction: 'asc' | 'desc';
} | null;

const ProjectList: React.FC<ProjectListProps> = ({ projects, masterData, onAddNew, onEditProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    leader: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>({
    name: 360,
    description: 240,
    leader: 120,
    department: 120,
    status: 120,
    progress: 156,
    action: 84
  });

  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const startResize = (col: string, e: React.MouseEvent) => {
    resizingRef.current = {
      col,
      startX: e.pageX,
      startWidth: colWidths[col]
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const newWidth = Math.max(startWidth + (e.pageX - startX), 60);
    setColWidths(prev => ({ ...prev, [col]: newWidth }));
  };

  const stopResize = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = 'default';
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prevSort => {
      if (!prevSort || prevSort.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prevSort.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null; // Clear sort on third click
    });
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = !filters.department || p.department === filters.department;
      const matchLeader = !filters.leader || p.leader === filters.leader;
      const matchStatus = !filters.status || p.status === filters.status;

      return matchSearch && matchDept && matchLeader && matchStatus;
    });
  }, [projects, searchTerm, filters]);

  const sortedProjects = useMemo(() => {
    if (!sortConfig) {
      return filteredProjects;
    }

    const sorted = [...filteredProjects].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortConfig.key) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'leader':
          aValue = a.leader || '';
          bValue = b.leader || '';
          break;
        case 'department':
          aValue = a.department || '';
          bValue = b.department || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [filteredProjects, sortConfig]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ department: '', leader: '', status: '' });
  };

  const exportToExcel = () => {
    // Flatten data: one row per milestone, or one row if no milestones
    const exportData = sortedProjects.flatMap(project => {
      if (project.milestones && project.milestones.length > 0) {
        return project.milestones.map(milestone => ({
          'Project name': project.name || '',
          'Leader': project.leader || '',
          'Department': project.department || '',
          'Progress (%)': project.progress || 0,
          'Milestone name': milestone.name || '',
          'Milestone description': milestone.description || '',
          'Milestone date': milestone.date || '',
          'Milestone status': milestone.completed ? 'Completed' : 'Pending'
        }));
      } else {
        // Project with no milestones
        return [{
          'Project name': project.name || '',
          'Leader': project.leader || '',
          'Department': project.department || '',
          'Progress (%)': project.progress || 0,
          'Milestone name': '',
          'Milestone description': '',
          'Milestone date': '',
          'Milestone status': ''
        }];
      }
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `projects_export_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/50 dark:bg-slate-900/50 glass px-5 py-4 rounded-2xl flex flex-col xl:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="flex-shrink-0">
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Project Portfolio
            <span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-black">
              {sortedProjects.length} NODES
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-grow justify-end w-full xl:w-auto">
          <div className="relative group flex-grow max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/30 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r border-slate-300 dark:border-slate-700">
              <Filter size={12} className="text-slate-400" />
            </div>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="bg-transparent border-none text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase focus:ring-0 cursor-pointer outline-none min-w-[100px]"
            >
              <option value="" className="dark:bg-slate-800">All Dept</option>
              {masterData.departments.map(d => <option key={d} value={d} className="dark:bg-slate-800">{d}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
            <select
              value={filters.leader}
              onChange={(e) => setFilters({ ...filters, leader: e.target.value })}
              className="bg-transparent border-none text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase focus:ring-0 cursor-pointer outline-none min-w-[100px]"
            >
              <option value="" className="dark:bg-slate-800">All Leaders</option>
              {masterData.leaders.map(l => <option key={l} value={l} className="dark:bg-slate-800">{l}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-transparent border-none text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase focus:ring-0 cursor-pointer outline-none min-w-[100px]"
            >
              <option value="" className="dark:bg-slate-800">All Status</option>
              {masterData.statuses.map(s => <option key={s.id} value={s.name} className="dark:bg-slate-800">{s.name}</option>)}
            </select>

            {(filters.department || filters.leader || filters.status || searchTerm) && (
              <button
                onClick={clearFilters}
                className="ml-1 p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-all"
                title="Clear Filters"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all font-black text-[10px] shadow-lg shadow-emerald-100 dark:shadow-none uppercase tracking-widest flex-shrink-0 active:scale-95"
            title="Export filtered projects to Excel"
          >
            <FileSpreadsheet size={16} />
            EXPORT TO EXCEL
          </button>

          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all font-black text-[10px] shadow-lg shadow-indigo-100 dark:shadow-none uppercase tracking-widest flex-shrink-0 active:scale-95"
          >
            <PlusCircle size={16} />
            CREATE NEW
          </button>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 glass rounded-3xl shadow-xl overflow-hidden border border-white/40 dark:border-slate-800 relative w-full h-[600px] flex flex-col">
        <div className="overflow-auto no-scrollbar flex-grow">
          <table className="w-full text-left border-collapse table-fixed" style={{ width: 'auto', minWidth: '100%' }}>
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-20 select-none">
                {[
                  { key: 'name', label: 'Project Name', sortable: true },
                  { key: 'description', label: 'Description', sortable: true },
                  { key: 'leader', label: 'Leader', sortable: true },
                  { key: 'department', label: 'Owner\'s Dept.', sortable: true },
                  { key: 'status', label: 'Status', sortable: true },
                  { key: 'progress', label: 'Progress', sortable: true },
                  { key: 'action', label: 'Action', sortable: false }
                ].map((col) => (
                  <th
                    key={col.key}
                    className="relative group px-5 py-3.5 text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors hover:text-indigo-500 bg-white dark:bg-slate-900"
                    style={{ width: `${colWidths[col.key]}px` }}
                  >
                    <div
                      className={`flex items-center gap-2 ${col.sortable ? 'cursor-pointer' : ''}`}
                      onClick={() => col.sortable && handleSort(col.key as SortConfig['key'])}
                    >
                      <span className="truncate">{col.label}</span>
                      {col.sortable && (
                        <span className="flex-shrink-0">
                          {sortConfig?.key === col.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp size={12} className="text-indigo-500" />
                            ) : (
                              <ArrowDown size={12} className="text-indigo-500" />
                            )
                          ) : (
                            <ArrowUpDown size={12} className="opacity-30" />
                          )}
                        </span>
                      )}
                    </div>
                    {col.key !== 'action' && (
                      <div
                        onMouseDown={(e) => startResize(col.key, e)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group-hover:bg-indigo-500/20 active:bg-indigo-500 transition-all z-10"
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {sortedProjects.map((project) => {
                const status = masterData.statuses.find(s => s.name === project?.status);

                return (
                  <tr key={project.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors group">
                    <td className="px-5 py-3.5 align-middle">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block truncate">
                        {project?.name || 'Untitled'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-2">
                        <Info size={12} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                          {project?.description || 'No description provided.'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <User size={12} className="text-indigo-400 dark:text-indigo-500 flex-shrink-0" />
                        <span className="text-[11px] font-bold truncate">{project?.leader || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center align-middle">
                      <div className="inline-flex items-center gap-1 px-3 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        <Building2 size={10} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          {project?.department || 'GENERAL'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center align-middle">
                      <span
                        className="inline-block px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider text-white shadow-sm min-w-[90px]"
                        style={{ backgroundColor: status?.color || '#94a3b8' }}
                      >
                        {project?.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex-grow h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                          <div
                            className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                            style={{ width: `${project?.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 min-w-[32px] text-right">
                          {project?.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right align-middle">
                      <button
                        onClick={() => onEditProject(project)}
                        className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-all shadow-sm active:scale-90"
                        title="Edit Project"
                      >
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectList;
