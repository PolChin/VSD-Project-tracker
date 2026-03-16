import React, { useState, useMemo } from 'react';
import { Project, MasterData, Milestone, Task } from '../types';
import { 
  Users, 
  BarChart3, 
  Target, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  TrendingUp, 
  Award, 
  Layers,
  Search,
  LayoutGrid
} from 'lucide-react';

interface LeaderAnalyticsProps {
  projects: Project[];
  masterData: MasterData;
}

const LeaderAnalytics: React.FC<LeaderAnalyticsProps> = ({ projects, masterData }) => {
  const [selectedLeader, setSelectedLeader] = useState<string>(masterData.leaders[0] || '');

  // Calculate overall metrics for all leaders
  const leaderStats = useMemo(() => {
    const stats: Record<string, { 
      totalProjects: number; 
      avgProgress: number; 
      achievedMilestones: number;
      totalMilestones: number;
      activeProjects: number;
    }> = {};

    masterData.leaders.forEach(leader => {
      const leaderProjects = projects.filter(p => p.leader === leader);
      const totalProgress = leaderProjects.reduce((sum, p) => sum + p.progress, 0);
      
      let totalM = 0;
      let achievedM = 0;
      leaderProjects.forEach(p => {
        (p.milestones || []).forEach(m => {
          totalM++;
          if (m.completed) achievedM++;
        });
      });

      stats[leader] = {
        totalProjects: leaderProjects.length,
        avgProgress: leaderProjects.length > 0 ? Math.round(totalProgress / leaderProjects.length) : 0,
        achievedMilestones: achievedM,
        totalMilestones: totalM,
        activeProjects: leaderProjects.filter(p => p.status !== 'Completed' && p.status !== 'Closed').length
      };
    });

    return stats;
  }, [projects, masterData.leaders]);

  // Specific data for selected leader
  const currentLeaderProjects = useMemo(() => 
    projects.filter(p => p.leader === selectedLeader), 
  [projects, selectedLeader]);

  const sortedLeaderNames = useMemo(() => 
    [...masterData.leaders].sort((a, b) => (leaderStats[b]?.avgProgress || 0) - (leaderStats[a]?.avgProgress || 0)),
  [masterData.leaders, leaderStats]);

  const renderLeaderboard = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 mb-8 flex-shrink-0">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex-shrink-0">
          <Award size={24} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tighter">Leaderboard</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Global performance ranking</p>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto no-scrollbar flex-grow pr-1">
        {sortedLeaderNames.map((name, index) => {
          const stats = leaderStats[name];
          if (!stats || stats.totalProjects === 0) return null;

          return (
            <div 
              key={name}
              onClick={() => setSelectedLeader(name)}
              className={`flex items-center gap-4 p-4 rounded-3xl transition-all cursor-pointer group ${
                selectedLeader === name 
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl scale-[1.02]' 
                : 'bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-600/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex flex-shrink-0 items-center justify-center font-black text-sm shadow-sm ${
                selectedLeader === name ? 'bg-white/20' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}>
                {index + 1}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-xs font-black uppercase tracking-tight truncate mr-2">{name}</span>
                  <span className={`text-[11px] font-black ${selectedLeader === name ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {stats.avgProgress}%
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden shadow-inner ${selectedLeader === name ? 'bg-indigo-700' : 'bg-slate-200 dark:bg-slate-800'}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${selectedLeader === name ? 'bg-white' : 'bg-indigo-600 dark:bg-indigo-400'}`}
                    style={{ width: `${stats.avgProgress}%` }}
                  />
                </div>
              </div>
              <ChevronRight size={16} className={`flex-shrink-0 transition-transform ${selectedLeader === name ? 'text-white translate-x-1' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-400'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-8 h-[750px] mb-12">
      {/* Sidebar: Leaderboard */}
      <div className="xl:col-span-4 h-full overflow-hidden">
        {renderLeaderboard()}
      </div>

      {/* Main Analysis Area content */}
      <div className="xl:col-span-8 h-full bg-slate-50/50 dark:bg-slate-900/30 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {!selectedLeader ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
              <Users size={64} className="mb-6 text-slate-300" />
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">Select a Leader</h3>
              <p className="text-sm font-bold text-slate-400 mt-2">Choose from the ranking list to view deep-dive intelligence.</p>
            </div>
          ) : (
            <>
              {/* Leader Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight">{selectedLeader}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Leadership Portfolio Analytics</p>
                 </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-shrink-0">
                <div className="bg-indigo-600 dark:bg-indigo-500 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between h-40 transform transition-all hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-white/20 rounded-xl shadow-inner"><Layers size={20} /></div>
                    <TrendingUp size={20} className="text-white/40" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100 flex items-center gap-1.5"><LayoutGrid size={10} /> Nodes Managed</span>
                    <div className="text-4xl font-black leading-none mt-2">{leaderStats[selectedLeader]?.totalProjects || 0}</div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-40 transform transition-all hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400"><Target size={20} /></div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Target size={10} /> Portfolio Velocity</span>
                    <div className="text-4xl font-black leading-none mt-2 text-slate-900 dark:text-white">
                      {leaderStats[selectedLeader]?.avgProgress || 0}<span className="text-lg text-slate-400">%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-40 transform transition-all hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={20} /></div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><CheckCircle2 size={10} /> Milestone Success</span>
                    <div className="text-4xl font-black leading-none mt-2 text-slate-900 dark:text-white">
                      {leaderStats[selectedLeader]?.totalMilestones > 0 
                        ? Math.round((leaderStats[selectedLeader].achievedMilestones / leaderStats[selectedLeader].totalMilestones) * 100) 
                        : 0}<span className="text-lg text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Managed Node Distribution in Grid View */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200/50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                      <LayoutGrid size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Managed Node Distribution</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Active tracking parameters</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                   {currentLeaderProjects.map(project => {
                      const statusColor = masterData.statuses.find(s => s.name === project.status)?.color || '#94a3b8';
                      return (
                        <div key={project.id} className="group p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <h5 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate pr-2">{project.name}</h5>
                            <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase text-white shadow-sm flex-shrink-0" style={{ backgroundColor: statusColor }}>{project.status}</span>
                          </div>
                          
                          <div className="flex flex-col gap-1.5 mt-auto">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                               <span className="uppercase tracking-widest">Progress</span>
                               <span className="text-slate-700 dark:text-slate-300">{project.progress}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full rounded-full transition-all duration-700 w-full" style={{ width: `${project.progress}%`, backgroundColor: statusColor }} />
                            </div>
                          </div>
                        </div>
                      );
                   })}
                 </div>
              </div>

              {/* Milestone Integrity */}
              <div className="space-y-6 pb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                      <Target size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Target Integrity</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Performance against roadmap milestones</p>
                    </div>
                 </div>
                 <div className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {currentLeaderProjects.map(p => (
                      <div key={p.id} className="flex flex-col gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span className="truncate pr-4">{p.name}</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400 flex-shrink-0">{p.progress}%</span>
                        </div>
                        <div className="flex gap-2 h-2">
                          {p.milestones && p.milestones.length > 0 ? p.milestones.map(m => (
                            <div 
                              key={m.id} 
                              className={`flex-grow rounded-full transition-all shadow-sm ${m.completed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`} 
                              title={`${m.name} - ${m.completed ? 'Achieved' : 'Pending'}`}
                            />
                          )) : (
                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-full h-2 border border-slate-100 dark:border-slate-800" />
                          )}
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          margin: 15px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default LeaderAnalytics;
