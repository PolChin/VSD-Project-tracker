import React, { useState, useMemo } from 'react';
import { Project, MasterData } from '../types';
import { 
  Building2, 
  Edit3, 
  Search, 
  XCircle, 
  FileSpreadsheet, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  LayoutGrid,
  List,
  MoreVertical,
  Calendar,
  Layers,
  Activity
} from 'lucide-react';
import * as XLSX from 'xlsx';
import MultiSelectFilter from './MultiSelectFilter';

interface ProjectListProps {
  projects: Project[];
  masterData: MasterData;
  onAddNew: () => void;
  onEditProject: (project: Project) => void;
}

type SortConfig = {
  key: 'name' | 'leader' | 'department' | 'status' | 'progress';
  direction: 'asc' | 'desc';
} | null;

const ProjectList: React.FC<ProjectListProps> = ({ projects, masterData, onAddNew, onEditProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: [] as string[],
    leader: [] as string[],
    status: [] as string[]
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prevSort => {
      if (!prevSort || prevSort.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prevSort.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const pDept = (p.department || '').toString().trim().toUpperCase();
      const matchDept = filters.department.length === 0 ||
        filters.department.some(f => f.trim().toUpperCase() === pDept);

      const pLeader = (p.leader || '').toString().trim().toUpperCase();
      const matchLeader = filters.leader.length === 0 ||
        filters.leader.some(f => f.trim().toUpperCase() === pLeader);

      const pStatus = (p.status || '').toString().trim().toUpperCase();
      const matchStatus = filters.status.length === 0 ||
        filters.status.some(f => f.trim().toUpperCase() === pStatus);

      return matchSearch && matchDept && matchLeader && matchStatus;
    });
  }, [projects, searchTerm, filters]);

  const sortedProjects = useMemo(() => {
    if (!sortConfig) return filteredProjects;

    return [...filteredProjects].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortConfig.key) {
        case 'name': aValue = a.name || ''; bValue = b.name || ''; break;
        case 'leader': aValue = a.leader || ''; bValue = b.leader || ''; break;
        case 'department': aValue = a.department || ''; bValue = b.department || ''; break;
        case 'status': aValue = a.status || ''; bValue = b.status || ''; break;
        case 'progress': aValue = a.progress || 0; bValue = b.progress || 0; break;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortConfig]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ department: [], leader: [], status: [] });
  };

  const exportToExcel = () => {
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

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    XLSX.writeFile(workbook, `projects_export_${timestamp}.xlsx`);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-center gap-4 shadow-sm border border-slate-200 dark:border-slate-800 relative z-50">
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex-shrink-0">
             <Layers size={24} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Project Portfolio</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Showing {sortedProjects.length} tracking nodes</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
          
          {/* Search Input */}
          <div className="relative flex-grow max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
            />
          </div>

          {/* Filters Suite */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <MultiSelectFilter
              label="Dept"
              options={masterData.departments}
              selectedValues={filters.department}
              onChange={(values) => setFilters({ ...filters, department: values })}
              className="w-[130px] flex-shrink-0"
            />
            <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <MultiSelectFilter
              label="Leader"
              options={masterData.leaders}
              selectedValues={filters.leader}
              onChange={(values) => setFilters({ ...filters, leader: values })}
              className="w-[130px] flex-shrink-0"
            />
            <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <MultiSelectFilter
              label="Status"
              options={masterData.statuses.map(s => s.name)}
              selectedValues={filters.status}
              onChange={(values) => setFilters({ ...filters, status: values })}
              className="w-[130px] flex-shrink-0"
            />

            <button
              onClick={clearFilters}
              className={`ml-0.5 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all 
                ${(filters.department.length > 0 || filters.leader.length > 0 || filters.status.length > 0 || searchTerm) ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              title="Clear Filters"
            >
              <XCircle size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold text-sm shadow-sm"
              title="Export to Excel"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Layout for Projects */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative z-10 mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th 
                  className="px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {sortConfig?.key === 'status' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-500" /> : <ArrowDown size={14} className="text-indigo-500" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 min-w-[300px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Project Name
                    <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {sortConfig?.key === 'name' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-500" /> : <ArrowDown size={14} className="text-indigo-500" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort('leader')}
                >
                  <div className="flex items-center gap-2">
                    Leader
                    <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {sortConfig?.key === 'leader' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-500" /> : <ArrowDown size={14} className="text-indigo-500" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center gap-2">
                    Department
                    <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {sortConfig?.key === 'department' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-500" /> : <ArrowDown size={14} className="text-indigo-500" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 whitespace-nowrap text-center text-slate-500">
                  <div className="flex items-center justify-center">Metrics</div>
                </th>
                <th 
                  className="px-6 py-4 min-w-[150px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort('progress')}
                >
                  <div className="flex items-center gap-2">
                    Progress
                    <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {sortConfig?.key === 'progress' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-500" /> : <ArrowDown size={14} className="text-indigo-500" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-40" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 whitespace-nowrap text-right text-slate-500">
                  <div className="flex items-center justify-end">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {sortedProjects.map((project) => {
                const status = masterData.statuses.find(s => s.name === project.status);
                const milestoneCount = project.milestones?.length || 0;
                const completedMilestones = project.milestones?.filter(m => m.completed).length || 0;
                const taskCount = project.tasks?.length || 0;

                return (
                  <tr 
                    key={project.id}
                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm"
                        style={{ 
                          backgroundColor: status?.color || '#94a3b8', 
                          color: '#ffffff'
                        }}
                      >
                        {project.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">
                          {project.name || 'Untitled Project'}
                        </span>
                        {project.description && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">
                            {project.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: `${status?.color || '#94a3b8'}20`, color: status?.color || '#94a3b8' }}>
                          {project.leader?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {project.leader || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {project.department || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400" title="Tasks">
                          <List size={14} className="text-indigo-400" /> 
                          <span>{taskCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400" title="Milestones">
                          <Calendar size={14} className="text-emerald-500" />
                          <span>{completedMilestones}/{milestoneCount}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{project.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${project.progress || 0}%`, backgroundColor: status?.color || '#6366f1' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => onEditProject(project)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
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
          
          {sortedProjects.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-transparent">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
                 <Activity size={32} className="text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Portfolio Empty</h3>
              <p className="text-[13px] font-medium text-slate-500 max-w-sm leading-relaxed mb-6">
                No tracking nodes match your current parameters. Adjust your filters or deploy a new project node.
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProjectList;
