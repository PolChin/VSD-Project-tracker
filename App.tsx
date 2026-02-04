
import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs
} from './firebase';
import { Project, MasterData } from './types';
import LoadingScreen from './components/LoadingScreen';
import GanttDashboard from './components/GanttDashboard';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import VarianceUI from './components/VarianceUI';
import { LayoutDashboard, ListTodo, History, X } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'history'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [masterData, setMasterData] = useState<MasterData>({
    leaders: [],
    departments: [],
    statuses: []
  });

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    const fetchMasterData = async () => {
      try {
        const leaderSnap = await getDocs(collection(db, 'LeaderName'));
        const deptSnap = await getDocs(collection(db, 'Department'));
        const statusSnap = await getDocs(collection(db, 'status_master'));

        setMasterData({
          // Removed .toUpperCase() to preserve original database casing
          leaders: leaderSnap.docs.map(d => (d.data().Name || d.data().name || '').toString()).sort(),
          departments: deptSnap.docs.map(d => (d.data().Name || d.data().name || '').toString()).sort(),
          statuses: statusSnap.docs.map(d => ({
            id: d.id,
            name: d.data().name,
            color: d.data().color
          }))
        });
      } catch (err) {
        console.error("Master data fetch failed", err);
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

  if (loading) return <LoadingScreen message="Connecting to VSD Matrix..." />;

  const isModalOpen = showAddModal || editingProject !== null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            VSD <span className="text-indigo-600">Matrix</span>
          </h1>
          <p className="text-slate-500 font-medium">Enterprise Project Portfolio Intelligence</p>
        </div>

        {/* Navigation */}
        <nav className="flex bg-indigo-100/50 p-1.5 rounded-[2rem] glass">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'projects', icon: ListTodo, label: 'Projects' },
            { id: 'history', icon: History, label: 'Variance' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.8rem] transition-all duration-300 font-semibold ${
                activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                : 'text-indigo-900 hover:bg-white/50'
              }`}
            >
              <tab.icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="animate-in fade-in duration-700">
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
      </main>

      {/* Unified Project Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <button 
              onClick={handleCloseModal}
              className="absolute top-6 right-8 z-[110] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all shadow-xl"
            >
              <X size={24} />
            </button>
            <ProjectForm 
              masterData={masterData} 
              onComplete={handleCloseModal} 
              initialProject={editingProject || undefined}
            />
          </div>
        </div>
      )}

      <footer className="mt-20 text-center text-slate-400 text-sm font-medium">
        &copy; 2024 VSD Matrix • Executive Control Panel
      </footer>
    </div>
  );
};

export default App;
