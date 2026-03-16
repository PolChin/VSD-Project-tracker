import React, { useState, useEffect } from 'react';
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs
} from './firebase';
import { Project, MasterData, Task, Milestone } from './types';
import LoadingScreen from './components/LoadingScreen';
import GanttDashboard from './components/GanttDashboard';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import VarianceUI from './components/VarianceUI';
import LeaderAnalytics from './components/LeaderAnalytics';
import { 
  LayoutDashboard, 
  Layers, 
  Activity, 
  Sun, 
  Moon, 
  Users, 
  Plus,
  Box,
  Fingerprint
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'portfolio' | 'variance' | 'leaders'>('timeline');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [masterData, setMasterData] = useState<MasterData>({
    leaders: [],
    departments: [],
    statuses: []
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => {
        const data = doc.data({ serverTimestamps: 'estimate' });

        let updatedStr = new Date().toISOString();
        if (data.updatedAt) {
          if (typeof data.updatedAt.toDate === 'function') {
            updatedStr = data.updatedAt.toDate().toISOString();
          } else if (data.updatedAt instanceof Date) {
            updatedStr = data.updatedAt.toISOString();
          } else if (typeof data.updatedAt === 'string') {
            updatedStr = data.updatedAt;
          }
        }

        return {
          id: doc.id,
          name: String(data.name || 'Untitled'),
          leader: String(data.leader || 'N/A'),
          department: String(data.department || 'N/A'),
          status: String(data.status || 'Unknown'),
          progress: Number(data.progress || 0),
          tasks: (data.tasks || []).map((t: any) => ({
            id: String(t.id),
            name: String(t.name),
            description: String(t.description || ''),
            startDate: String(t.startDate),
            endDate: String(t.endDate),
            progress: Number(t.progress || 0),
            weight: Number(t.weight || 0)
          })) as Task[],
          milestones: (data.milestones || []).map((m: any) => ({
            id: String(m.id),
            name: String(m.name),
            description: String(m.description || ''),
            date: String(m.date),
            completed: !!m.completed
          })) as Milestone[],
          updatedAt: updatedStr,
          description: String(data.description || '')
        };
      }) as Project[];

      // CRITICAL: Filter out soft-deleted projects
      const visibleProjects = projectsData.filter(p => p.status !== 'Mark deleted');

      setProjects(visibleProjects);
      setLoading(false);
    }, (error: any) => {
      console.error("Firestore Error:", error?.message || "Internal Error");
      setLoading(false);
    });

    const fetchMasterData = async () => {
      try {
        const leaderSnap = await getDocs(collection(db, 'LeaderName'));
        const deptSnap = await getDocs(collection(db, 'Department'));
        const statusSnap = await getDocs(collection(db, 'status_master'));

        setMasterData({
          leaders: leaderSnap.docs.map(d => (d.data().Name || d.data().name || '').toString()).sort(),
          departments: deptSnap.docs.map(d => (d.data().Name || d.data().name || '').toString()).sort(),
          statuses: statusSnap.docs.map(d => ({
            id: d.id,
            name: String(d.data().name || ''),
            color: String(d.data().color || '#94a3b8')
          }))
        });
      } catch (err: any) {
        console.error("Master data fetch failed:", err?.message || "Internal Error");
      }
    };

    fetchMasterData();
    return () => unsubscribe();
  }, []);

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingProject(null);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  if (loading) return <LoadingScreen message="Initializing Workspace..." />;

  const isModalOpen = showAddModal || editingProject !== null;

  return (
    <div className="h-screen flex flex-col overflow-y-scroll overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* Top Navigation Bar */}
      <nav className="flex-shrink-0 sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Box size={18} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
                  VSD System
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">
                  Tracker
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
              {[
                { id: 'timeline', icon: LayoutDashboard, label: 'Timeline' },
                { id: 'portfolio', icon: Layers, label: 'Portfolio' },
                { id: 'variance', icon: Activity, label: 'Variance' },
                { id: 'leaders', icon: Users, label: 'Leaders' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ease-out
                    ${activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }
                  `}
                >
                  <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>New Project</span>
              </button>
            </div>
            
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500 ease-out">
        {activeTab === 'timeline' && <GanttDashboard projects={projects} masterData={masterData} />}
        {activeTab === 'portfolio' && (
          <ProjectList
            projects={projects}
            masterData={masterData}
            onAddNew={() => setShowAddModal(true)}
            onEditProject={handleEditProject}
          />
        )}
        {activeTab === 'variance' && <VarianceUI projects={projects} />}
        {activeTab === 'leaders' && <LeaderAnalytics projects={projects} masterData={masterData} />}
      </main>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md transition-opacity"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-7xl max-h-[95vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
               <ProjectForm
                  masterData={masterData}
                  onComplete={handleCloseModal}
                  initialProject={editingProject || undefined}
                  onClose={handleCloseModal} // Assuming ProjectForm handles its own close button if passed, otherwise we can wrap it
                />
            </div>
          </div>
        </div>
      )}

      {/* Footer System Status */}
      <footer className="flex-shrink-0 mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
           
           <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
             <Fingerprint size={14} />
             <span className="text-[10px] font-bold tracking-widest uppercase">VSD Secure Node • v2.0</span>
           </div>

           <div className="flex flex-wrap items-center justify-center gap-4">
              {masterData.statuses.map((status) => (
                <div key={status.id} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {status.name}
                  </span>
                </div>
              ))}
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

