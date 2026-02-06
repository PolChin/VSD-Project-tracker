
import React from 'react';
import { Project, MasterData } from '../types';
import { User, Building2, PlusCircle, Edit3 } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  masterData: MasterData;
  onAddNew: () => void;
  onEditProject: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, masterData, onAddNew, onEditProject }) => {
  return (
    <div className="space-y-4">
      {/* Condensed List Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white/50 dark:bg-slate-900/50 glass px-5 py-3 rounded-2xl gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Projects Portfolio</h2>
        </div>
        <button 
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all font-black text-[10px] shadow-lg shadow-indigo-100 dark:shadow-none uppercase tracking-widest"
        >
          <PlusCircle size={16} />
          NEW PROJECT
        </button>
      </div>

      {/* Condensed Project Table */}
      <div className="bg-white/80 dark:bg-slate-900/80 glass rounded-2xl shadow-lg overflow-hidden border border-white/40 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-5 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Project</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Leader</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest text-center">Status</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Progress</th>
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {projects?.map((project) => {
                const status = masterData.statuses.find(s => s.name === project?.status);
                
                return (
                  <tr key={project.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors group">
                    <td className="px-5 py-3 cursor-pointer" onClick={() => onEditProject(project)}>
                      <div className="flex flex-col min-w-[200px]">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                          {project?.name || 'Untitled'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5 font-medium">
                          {project?.description || 'No description.'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <User size={12} className="text-slate-300 dark:text-slate-600" />
                          <span className="text-[10px] font-bold">{project?.leader || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <Building2 size={12} className="text-slate-300 dark:text-slate-600" />
                          <span className="text-[9px] font-medium tracking-tight uppercase">{project?.department || 'General'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span 
                        className="inline-block px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider text-white shadow-sm"
                        style={{ backgroundColor: status?.color || '#94a3b8' }}
                      >
                        {project?.status || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 w-32">
                        <div className="flex-grow h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700">
                          <div 
                            className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${project?.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 min-w-[24px]">{project?.progress || 0}%</span>
                      </div>
                    </td>

                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => onEditProject(project)}
                        className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-400 dark:text-slate-600 text-xs font-bold tracking-widest uppercase">
                    Portfolio is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectList;
