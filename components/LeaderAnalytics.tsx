
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
    <div className="bg-white/80 dark:bg-slate-900/60 glass rounded-[2.5rem] p-8 shadow-xl border border-white/50 dark:border-slate-800 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-8 flex-shrink-0">
        <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-lg">
          <Award size={18} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Leader Performance Ranking</h4>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Global progress comparison</p>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto no-scrollbar flex-grow pr-1">
        {sortedLeaderNames.map((name, index) => {
          const stats = leaderStats[name];
          if (!stats || stats.totalProjects === 0) return null;

          return (
            <div 
              key={name}
              onClick={() => setSelectedLeader(name)}
              className={`flex items-center gap-4 p-4 rounded-[1.5rem] transition-all cursor-pointer group ${
                selectedLeader === name 
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl scale-[1.02]' 
                : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                selectedLeader === name ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {index + 1}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-xs font-black uppercase tracking-tight">{name}</span>
                  <span className={`text-[10px] font-black ${selectedLeader === name ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {stats.avgProgress}%
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${selectedLeader === name ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${selectedLeader === name ? 'bg-white' : 'bg-indigo-600 dark:bg-indigo-400'}`}
                    style={{ width: `${stats.avgProgress}%` }}
                  />
                </div>
              </div>
              <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-all ${selectedLeader === name ? 'text-white' : 'text-slate-300'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px] mb-12">
      {/* Sidebar: Leaderboard */}
      <div className="lg:col-span-4 h-full overflow-hidden">
        {renderLeaderboard()}
      </div>

      {/* Main Analysis Area - Fixed at 650px height per user request */}
      <div className="lg:col-span-8 h-full bg-white/80 dark:bg-slate-900/60 glass rounded-[2.5rem] shadow-xl border border-white/50 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {!selectedLeader ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
              <Users size={64} className="mb-6 text-slate-300" />
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">Select a Leader</h3>
              <p className="text-sm font-bold text-slate-400 mt-2">Choose from the ranking list to view deep-dive intelligence.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-shrink-0">
                <div className="bg-indigo-600 dark:bg-indigo-500 rounded-[2.5rem] p-6 text-white shadow-xl flex flex-col justify-between h-40">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-white/20 rounded-xl"><Layers size={18} /></div>
                    <TrendingUp size={16} className="text-white/40" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100">Total Projects Managed</span>
                    <div className="text-4xl font-black leading-none mt-1">{leaderStats[selectedLeader]?.totalProjects || 0}</div>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-6 shadow-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between h-40">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400"><Target size={18} /></div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Portfolio Average Progress</span>
                    <div className="text-4xl font-black leading-none mt-1 text-slate-800 dark:text-white">
                      {leaderStats[selectedLeader]?.avgProgress || 0}%
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-6 shadow-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between h-40">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400"><Award size={18} /></div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Milestone Success Rate</span>
                    <div className="text-4xl font-black leading-none mt-1 text-slate-800 dark:text-white">
                      {leaderStats[selectedLeader]?.totalMilestones > 0 
                        ? Math.round((leaderStats[selectedLeader].achievedMilestones / leaderStats[selectedLeader].totalMilestones) * 100) 
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Managed Node Distribution */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                      <LayoutGrid size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tighter">Managed Node Distribution</h4>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Active tracking for {selectedLeader}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {currentLeaderProjects.map(project => {
                      const statusColor = masterData.statuses.find(s => s.name === project.status)?.color || '#94a3b8';
                      return (
                        <div key={project.id} className="group p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 transition-all flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 truncate">{project.name}</span>
                            <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase text-white" style={{ backgroundColor: statusColor }}>{project.status}</span>
                          </div>
                          <div className="h-1.5 bg-white dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${project.progress}%`, backgroundColor: statusColor }} />
                          </div>
                        </div>
                      );
                   })}
                 </div>
              </div>

              {/* Milestone Integrity */}
              <div className="space-y-6 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tighter">Strategic Milestone Integrity</h4>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Performance against roadmap targets</p>
                    </div>
                 </div>
                 <div className="space-y-6">
                    {currentLeaderProjects.map(p => (
                      <div key={p.id} className="flex flex-col gap-2">
                        <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                          <span>{p.name}</span>
                          <span className="text-indigo-500">{p.progress}%</span>
                        </div>
                        <div className="flex gap-1.5 h-1.5">
                          {p.milestones && p.milestones.length > 0 ? p.milestones.map(m => (
                            <div 
                              key={m.id} 
                              className={`flex-grow rounded-full transition-all ${m.completed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`} 
                              title={m.name}
                            />
                          )) : (
                            <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-1" />
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
