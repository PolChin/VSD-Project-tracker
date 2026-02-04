
import React from 'react';
import { Project, MasterData } from '../types';
import { User, Building2, ChevronRight, PlusCircle, Edit3 } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  masterData: MasterData;
  onAddNew: () => void;
  onEditProject: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, masterData, onAddNew, onEditProject }) => {
  return (
    <div className="space-y-6">
      {/* List Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white/50 glass p-6 rounded-[2rem] gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Projects Portfolio</h2>
          <p className="text-slate-500 text-sm font-medium">Active business units and delivery tracks</p>
        </div>
        <button 
          onClick={onAddNew}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all font-bold shadow-xl shadow-indigo-100"
        >
          <PlusCircle size={20} />
          NEW PROJECT
        </button>
      </div>

      {/* Project Table/List */}
      <div className="bg-white/80 glass rounded-[2.5rem] shadow-xl overflow-hidden border border-white/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Project Details</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Leader & Dept</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Progress</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects?.map((project) => {
                const status = masterData.statuses.find(s => s.name === project?.status);
                
                return (
                  <tr key={project.id} className="hover:bg-indigo-50/30 transition-colors group cursor-default">
                    {/* Project Details */}
                    <td className="px-8 py-6 cursor-pointer" onClick={() => onEditProject(project)}>
                      <div className="flex flex-col min-w-[250px]">
                        <span className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {project?.name || 'Untitled Project'}
                        </span>
                        <span className="text-xs text-slate-400 line-clamp-1 mt-1 font-medium">
                          {project?.description || 'No description provided.'}
                        </span>
                      </div>
                    </td>

                    {/* Leader & Dept */}
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User size={14} className="text-slate-300" />
                          <span className="text-xs font-bold">{project?.leader || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Building2 size={14} className="text-slate-300" />
                          <span className="text-[11px] font-medium">{project?.department || 'General'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-6 text-center">
                      <span 
                        className="inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-sm"
                        style={{ backgroundColor: status?.color || '#94a3b8' }}
                      >
                        {project?.status || 'Unknown'}
                      </span>
                    </td>

                    {/* Progress Bar */}
                    <td className="px-6 py-6">
                      <div className="flex flex-col w-40">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black text-indigo-600">{project?.progress || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${project?.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => onEditProject(project)}
                        className="p-2 text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1 justify-end ml-auto"
                      >
                        <span className="text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                    No active projects found in the matrix.
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
