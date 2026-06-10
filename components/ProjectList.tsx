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
  Activity,
  Presentation,
  GripVertical
} from 'lucide-react';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import { Reorder, useDragControls } from 'framer-motion';
import MultiSelectFilter from './MultiSelectFilter';

interface ProjectListProps {
  projects: Project[];
  masterData: MasterData;
  onAddNew: () => void;
  onEditProject: (project: Project) => void;
  onUpdateProgress: (project: Project) => void;
}

type SortConfig = {
  key: 'name' | 'leader' | 'department' | 'status' | 'progress' | 'ciNo';
  direction: 'asc' | 'desc';
} | null;

type ColumnKey = 'status' | 'name' | 'ciNo' | 'leader' | 'department' | 'metrics' | 'progress' | 'actions';

const ProjectList: React.FC<ProjectListProps> = ({ projects, masterData, onAddNew, onEditProject, onUpdateProgress }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: [] as string[],
    leader: [] as string[],
    status: [] as string[]
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  // Column Reordering & Resizing State
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
    'status', 'name', 'ciNo', 'leader', 'department', 'metrics', 'progress', 'actions'
  ]);

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
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ciNo || '').toLowerCase().includes(searchTerm.toLowerCase());

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
        case 'ciNo': aValue = a.ciNo || ''; bValue = b.ciNo || ''; break;
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
    const data = sortedProjects.map(p => ({
      'Project Name': p.name,
      'CI No.': p.ciNo || '',
      'Status': p.status,
      'Leader': p.leader,
      'Department': p.department,
      'Progress': `${p.progress}%`,
      'Tasks': p.tasks?.length || 0,
      'Milestones': p.milestones?.length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');
    XLSX.writeFile(wb, `vsd_portfolio_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportToPowerPoint = () => {
    const pres = new pptxgen();
    
    // 1. Title Slide
    let titleSlide = pres.addSlide();
    titleSlide.background = { color: 'F8FAFC' };
    titleSlide.addText('VSD Project Portfolio', {
      x: 0, y: '35%', w: '100%', align: 'center', fontSize: 44, bold: true, color: '1E293B'
    });
    titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: 0, y: '50%', w: '100%', align: 'center', fontSize: 18, color: '64748B'
    });

    // 2. Summary Table Slide
    let tableSlide = pres.addSlide();
    tableSlide.addText('Portfolio Overview', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '4F46E5' });

    // Table Data
    const headers = columnOrder
      .filter(key => key !== 'actions')
      .map(key => ({
        text: key.charAt(0).toUpperCase() + key.slice(1).replace('name', 'Project Name').replace('ciNo', 'CI No.'),
        options: { bold: true, fill: { color: '4F46E5' }, color: 'FFFFFF', align: 'center', fontSize: 12 }
      }));

    const rows = sortedProjects.map(project => 
      columnOrder
        .filter(key => key !== 'actions')
        .map(key => {
          let text = '';
          switch (key) {
            case 'status': text = project.status || ''; break;
            case 'name': text = project.name || ''; break;
            case 'ciNo': text = project.ciNo || ''; break;
            case 'leader': text = project.leader || ''; break;
            case 'department': text = project.department || ''; break;
            case 'metrics': text = `Tasks: ${project.tasks?.length || 0}`; break;
            case 'progress': text = `${project.progress || 0}%`; break;
          }
          return { text, options: { fontSize: 10, border: { pt: 1, color: 'E2E8F0' }, align: 'center' } };
        })
    );

    tableSlide.addTable([headers, ...rows], {
      x: 0.5, y: 1.2, w: 9,
      colW: columnOrder.filter(k => k !== 'actions').map(k => {
        switch(k) {
          case 'name': return 2.8;
          case 'status': return 1.0;
          case 'ciNo': return 1.0;
          case 'leader': return 1.2;
          case 'department': return 1.0;
          case 'metrics': return 0.8;
          case 'progress': return 1.0;
          default: return 1.0;
        }
      }),
      valign: 'middle'
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    pres.writeFile({ fileName: `vsd_portfolio_${timestamp}.pptx` });
  };

  const getColClass = (key: ColumnKey) => {
    switch (key) {
      case 'status': return 'w-[138px] flex-shrink-0';
      case 'name': return 'flex-grow min-w-[200px]';
      case 'ciNo': return 'w-[120px] flex-shrink-0';
      case 'leader': return 'w-[168px] flex-shrink-0';
      case 'department': return 'w-[148px] flex-shrink-0';
      case 'metrics': return 'w-[131px] flex-shrink-0';
      case 'progress': return 'w-[148px] flex-shrink-0';
      case 'actions': return 'w-[100px] flex-shrink-0';
      default: return 'w-[100px] flex-shrink-0';
    }
  };

  const renderHeaderCell = (key: ColumnKey) => {
    return (
      <div
        className="relative group border-r border-slate-200/50 dark:border-slate-800/50 h-full flex items-center bg-slate-50/50 dark:bg-slate-950/20 w-full"
      >
        <div
          className={`flex-grow px-4 py-4 flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none overflow-hidden`}
          onClick={() => (key !== 'metrics' && key !== 'actions') && handleSort(key as any)}
        >
          <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity absolute -left-0.5" />
          <span className="uppercase text-[11px] font-extrabold text-slate-500 tracking-wider truncate">
            {key === 'name' ? 'Project Name' : key === 'ciNo' ? 'CI No.' : key}
          </span>
          {(key !== 'metrics' && key !== 'actions') && sortConfig?.key === key && (
             <span className="text-indigo-500">
               {sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> }
             </span>
          )}
        </div>
      </div>
    );
  };

  const renderDataCell = (key: ColumnKey, project: Project, status?: any) => {
    const colClass = getColClass(key);
    const milestoneCount = project.milestones?.length || 0;
    const completedMilestones = project.milestones?.filter(m => m.completed).length || 0;
    const taskCount = project.tasks?.length || 0;

    const commonClass = `${colClass} px-4 py-4 break-words overflow-visible border-r border-slate-100 dark:border-slate-800/50`;

    switch (key) {
      case 'status':
        return (
          <div key="status" className={`${commonClass} flex items-center`}>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm"
              style={{
                backgroundColor: status?.color || '#94a3b8',
                color: '#ffffff'
              }}
            >
              {project.status || 'Unknown'}
            </span>
          </div>
        );
      case 'name':
        return (
          <div key="name" className={`${commonClass} flex items-start`}>
            <span className="text-[14px] font-bold text-slate-800 dark:text-white leading-snug whitespace-normal">
              {project.name || 'Untitled Project'}
            </span>
          </div>
        );
      case 'ciNo':
        return (
          <div key="ciNo" className={`${commonClass} flex items-center`}>
            <span className="text-[13px] font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
              {project.ciNo || '-'}
            </span>
          </div>
        );
      case 'leader':
        return (
          <div key="leader" className={`${commonClass} flex items-center`}>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: `${status?.color || '#94a3b8'}20`, color: status?.color || '#94a3b8' }}>
                {project.leader?.charAt(0) || '?'}
              </div>
              <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                {project.leader || 'Unassigned'}
              </span>
            </div>
          </div>
        );
      case 'department':
        return (
          <div key="department" className={`${commonClass} flex items-center`}>
            <span className="text-[14px] font-medium text-slate-600 dark:text-slate-300 truncate">
              {project.department || 'General'}
            </span>
          </div>
        );
      case 'metrics':
        return (
          <div key="metrics" className={`${commonClass} flex items-center justify-center`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <List size={12} className="text-indigo-400" />
                <span>{taskCount}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Calendar size={12} className="text-emerald-500" />
                <span>{completedMilestones}/{milestoneCount}</span>
              </div>
            </div>
          </div>
        );
      case 'progress':
        return (
          <div key="progress" className={`${commonClass} flex flex-col justify-center gap-1.5`}>
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-700 dark:text-slate-200">
              <span>{project.progress}%</span>
            </div>
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${project.progress || 0}%`, backgroundColor: status?.color || '#6366f1' }}
              />
            </div>
          </div>
        );
      case 'actions':
        return (
          <div key="actions" className={`${commonClass} flex items-center justify-center gap-3`}>
            <button
              onClick={() => onUpdateProgress(project)}
              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-indigo-500 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 shadow-sm transition-all duration-200"
              title="Update Progress"
            >
              <Presentation size={16} />
            </button>
            <button
              onClick={() => onEditProject(project)}
              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-700 shadow-sm transition-all duration-200"
              title="Edit Project"
            >
              <Edit3 size={16} />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-hidden">

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col xl:flex-row justify-between items-center gap-4 shadow-sm border border-slate-200 dark:border-slate-800 relative z-50">

        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex-shrink-0">
            <Layers size={24} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Project Portfolio</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Showing {sortedProjects.length} nodes</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">

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

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <MultiSelectFilter
              label="Dept"
              options={masterData.departments}
              selectedValues={filters.department}
              onChange={(values) => setFilters({ ...filters, department: values })}
              className="w-[120px] flex-shrink-0"
            />
            <MultiSelectFilter
              label="Leader"
              options={masterData.leaders}
              selectedValues={filters.leader}
              onChange={(values) => setFilters({ ...filters, leader: values })}
              className="w-[120px] flex-shrink-0"
            />
            <MultiSelectFilter
              label="Status"
              options={masterData.statuses.map(s => s.name)}
              selectedValues={filters.status}
              onChange={(values) => setFilters({ ...filters, status: values })}
              className="w-[120px] flex-shrink-0"
            />
            <button
              onClick={clearFilters}
              className={`ml-0.5 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all 
                ${(filters.department.length > 0 || filters.leader.length > 0 || filters.status.length > 0 || searchTerm) ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
              <XCircle size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-colors font-bold text-xs"
            >
              <FileSpreadsheet size={16} />
              <span>Excel</span>
            </button>
            <button
              onClick={exportToPowerPoint}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-600 dark:bg-indigo-50 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-xs shadow-lg shadow-indigo-500/20"
            >
              <Presentation size={16} />
              <span>PPT</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-grow overflow-hidden relative z-10 flex flex-col mb-2">
        <div className="flex-grow overflow-auto relative custom-scrollbar">
          
          <div className="min-w-max w-full">
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <Reorder.Group
                as="div"
                axis="x"
                values={columnOrder}
                onReorder={setColumnOrder}
                className="flex w-full"
              >
                {columnOrder.map((colKey) => (
                  <Reorder.Item
                    key={colKey}
                    value={colKey}
                    as="div"
                    className={getColClass(colKey)}
                  >
                    {renderHeaderCell(colKey)}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 w-full">
              {sortedProjects.map((project) => {
                const status = masterData.statuses.find(s => s.name === project.status);
                return (
                  <div key={project.id} className="flex group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors w-full">
                    {columnOrder.map((colKey) => renderDataCell(colKey, project, status))}
                  </div>
                );
              })}

              {sortedProjects.length === 0 && (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6">
                    <Search size={32} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500">No project nodes found</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
export default ProjectList;
