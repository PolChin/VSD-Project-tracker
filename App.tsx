
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
import { LayoutDashboard, ListTodo, History, X, Sun, Moon, Users } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'history' | 'analytics'>('dashboard');
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

  if (loading) return <LoadingScreen message="Connecting to VSD Project summary..." />;

  const isModalOpen = showAddModal || editingProject !== null;

  return (
    <div className="w-full mx-auto px-4 py-4 min-h-screen flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 w-full">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              VSD <span className="text-indigo-600 dark:text-indigo-400">Project summary</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Project Portfolio Intelligence</p>
          </div>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-all"
            aria-label="Toggle Dark Mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <nav className="flex bg-indigo-100/50 dark:bg-slate-800/50 p-1 rounded-2xl glass shadow-lg">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Timeline' },
            { id: 'projects', icon: ListTodo, label: 'Portfolio' },
            { id: 'history', icon: History, label: 'Analysis' },
            { id: 'analytics', icon: Users, label: 'Leaders' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-300 font-bold text-xs ${
                activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-md scale-105' 
                : 'text-indigo-900 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-grow animate-in fade-in duration-500 w-full">
        {activeTab === 'dashboard' && <GanttDashboard projects={projects} masterData={masterData} />}
        {activeTab === 'projects' && (
          <ProjectList 
            projects={projects} 
            masterData={masterData} 
            onAddNew={() => setShowAddModal(true)} 
            onEditProject={handleEditProject}
          />
        )}
        {activeTab === 'history' && <VarianceUI projects={projects} />}
        {activeTab === 'analytics' && <LeaderAnalytics projects={projects} masterData={masterData} />}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-7xl max-h-[95vh] overflow-y-auto no-scrollbar">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-6 z-[110] p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-400 hover:text-rose-500 transition-all shadow-md border dark:border-slate-700"
            >
              <X size={20} />
            </button>
            <ProjectForm 
              masterData={masterData} 
              onComplete={handleCloseModal} 
              initialProject={editingProject || undefined}
            />
          </div>
        </div>
      )}

      <footer className="mt-8 pb-4 text-center text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] w-full">
        &copy; 2024 VSD Project summary • Executive Control Panel
      </footer>
    </div>
  );
};

export default App;
