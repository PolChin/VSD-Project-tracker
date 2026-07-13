import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from '../firebase';
import { QuickWin, MasterData } from '../types';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Calendar,
  User,
  Tag,
  AlertCircle,
  X,
  Building2,
  Sparkles,
  Filter,
  TrendingUp,
  Zap,
  HelpCircle,
  Kanban,
  List,
  CheckSquare
} from 'lucide-react';


interface QuickWinsBoardProps {
  masterData: MasterData;
}

const QuickWinsBoard: React.FC<QuickWinsBoardProps> = ({ masterData }) => {
  const [quickWins, setQuickWins] = useState<QuickWin[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [dueDateStart, setDueDateStart] = useState<string>('');
  const [dueDateEnd, setDueDateEnd] = useState<string>('');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Modals & Forms
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuickWin, setEditingQuickWin] = useState<QuickWin | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null); // first level overlay confirm
  const [showDoubleDeleteConfirmId, setShowDoubleDeleteConfirmId] = useState<string | null>(null); // second level modal confirm

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [isCustomAssignee, setIsCustomAssignee] = useState(false);
  const [customAssigneeText, setCustomAssigneeText] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [requester, setRequester] = useState('');
  const [department, setDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptText, setCustomDeptText] = useState('');
  const [status, setStatus] = useState<'Backlog' | 'In Progress' | 'Review' | 'Done' | ''>('');
  const [category, setCategory] = useState<'On-site Issue Solving' | 'Process Improvement' | ''>('');
  const [valueRelease, setValueRelease] = useState('');
  const [manpowerSaving, setManpowerSaving] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load Quick Wins from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'quick_wins'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wins: QuickWin[] = [];
      snapshot.forEach((doc) => {
        wins.push({ id: doc.id, ...doc.data() } as QuickWin);
      });
      setQuickWins(wins);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching quick wins from Firestore:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Get unique assignees list for filter
  const uniqueAssignees = useMemo(() => {
    const set = new Set<string>();
    quickWins.forEach(win => {
      if (win.assignee) set.add(win.assignee);
    });
    masterData.leaders.forEach(l => set.add(l));
    return Array.from(set).sort();
  }, [quickWins, masterData.leaders]);

  // Filter Quick Wins
  const filteredQuickWins = useMemo(() => {
    return quickWins.filter(win => {
      const matchSearch =
        win.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (win.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (win.assignee || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (win.requester || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchPriority = filterPriority === 'All' || win.priority === filterPriority;
      const matchCategory = filterCategory === 'All' || win.category === filterCategory;
      const matchDept = filterDepartment === 'All' || win.department === filterDepartment;
      const matchAssignee = filterAssignee === 'All' || win.assignee === filterAssignee;
      
      const matchDateStart = !dueDateStart || (win.dueDate ? win.dueDate >= dueDateStart : false);
      const matchDateEnd = !dueDateEnd || (win.dueDate ? win.dueDate <= dueDateEnd : false);

      return matchSearch && matchPriority && matchCategory && matchDept && matchAssignee && matchDateStart && matchDateEnd;
    });
  }, [quickWins, searchTerm, filterPriority, filterCategory, filterDepartment, filterAssignee, dueDateStart, dueDateEnd]);

  // Statistics
  const stats = useMemo(() => {
    const total = quickWins.length;
    const active = quickWins.filter(w => w.status !== 'Done').length;
    const completed = quickWins.filter(w => w.status === 'Done').length;
    const problemSolvingSolved = quickWins.filter(w => w.status === 'Done' && w.category === 'On-site Issue Solving').length;
    const processImproved = quickWins.filter(w => w.status === 'Done' && w.category === 'Process Improvement').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, active, completed, problemSolvingSolved, processImproved, completionRate };
  }, [quickWins]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('text', id); // Fallback for some browsers
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const colDiv = e.currentTarget as HTMLElement;
    const currentCount = parseInt(colDiv.getAttribute('data-drag-count') || '0', 10);
    colDiv.setAttribute('data-drag-count', (currentCount + 1).toString());
    colDiv.classList.add('drag-active');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const colDiv = e.currentTarget as HTMLElement;
    const currentCount = parseInt(colDiv.getAttribute('data-drag-count') || '0', 10);
    const newCount = Math.max(0, currentCount - 1);
    colDiv.setAttribute('data-drag-count', newCount.toString());
    if (newCount === 0) {
      colDiv.classList.remove('drag-active');
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'Backlog' | 'In Progress' | 'Review' | 'Done') => {
    e.preventDefault();
    const colDiv = e.currentTarget as HTMLElement;
    colDiv.setAttribute('data-drag-count', '0');
    colDiv.classList.remove('drag-active');

    const winId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    if (!winId) return;

    const win = quickWins.find(w => w.id === winId);
    if (win && win.status !== targetStatus) {
      try {
        const docRef = doc(db, 'quick_wins', winId);
        await updateDoc(docRef, {
          status: targetStatus,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error updating quick win status in Firestore:", err);
      }
    }
  };

  // Handle Form Open (Create)
  const handleOpenCreate = () => {
    setEditingQuickWin(null);
    setTitle('');
    setDescription('');
    setAssignee('');
    setIsCustomAssignee(false);
    setCustomAssigneeText('');
    setPriority('');
    setDueDate('');
    setRequester('');
    setDepartment('');
    setIsCustomDept(false);
    setCustomDeptText('');
    setStatus('');
    setCategory('');
    setValueRelease('');
    setManpowerSaving('');
    setErrors({});
    setShowFormModal(true);
  };

  // Handle Form Open (Edit)
  const handleOpenEdit = (win: QuickWin) => {
    setEditingQuickWin(win);
    setTitle(win.title);
    setDescription(win.description || '');

    // Check if assignee is in master data
    if (masterData.leaders.includes(win.assignee)) {
      setAssignee(win.assignee);
      setIsCustomAssignee(false);
      setCustomAssigneeText('');
    } else {
      setAssignee('__custom__');
      setIsCustomAssignee(true);
      setCustomAssigneeText(win.assignee);
    }

    setPriority(win.priority);
    setDueDate(win.dueDate || '');
    setRequester(win.requester || '');

    // Check if department is in master data
    if (masterData.departments.includes(win.department)) {
      setDepartment(win.department);
      setIsCustomDept(false);
      setCustomDeptText('');
    } else {
      setDepartment('__custom__');
      setIsCustomDept(true);
      setCustomDeptText(win.department);
    }

    setStatus(win.status);
    setCategory(win.category);
    setValueRelease(win.valueRelease !== undefined && win.valueRelease !== null ? win.valueRelease.toString() : '');
    setManpowerSaving(win.manpowerSaving !== undefined && win.manpowerSaving !== null ? win.manpowerSaving.toString() : '');
    setErrors({});
    setShowFormModal(true);
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';

    const finalAssignee = isCustomAssignee ? customAssigneeText.trim() : assignee;
    if (!finalAssignee) newErrors.assignee = 'Assignee/Leader is required';

    const finalDept = isCustomDept ? customDeptText.trim() : department;
    if (!finalDept) newErrors.department = 'Department is required';

    if (!status) newErrors.status = 'Status is required';
    if (!category) newErrors.category = 'Category is required';
    if (!priority) newErrors.priority = 'Priority is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      assignee: finalAssignee,
      priority,
      dueDate: dueDate ? dueDate : null,
      requester: requester.trim(),
      department: finalDept,
      status,
      category,
      valueRelease: valueRelease.trim() !== '' ? parseFloat(valueRelease) : null,
      manpowerSaving: manpowerSaving.trim() !== '' ? parseFloat(manpowerSaving) : null,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingQuickWin) {
        // Edit Mode (Firestore)
        const docRef = doc(db, 'quick_wins', editingQuickWin.id);
        await updateDoc(docRef, payload);
      } else {
        // Create Mode (Firestore)
        const newDocRef = doc(collection(db, 'quick_wins'));
        await setDoc(newDocRef, {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      setShowFormModal(false);
    } catch (err) {
      console.error("Error saving quick win to Firestore:", err);
    }
  };

  // Delete Action
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'quick_wins', id));
      setShowDoubleDeleteConfirmId(null);
    } catch (err) {
      console.error("Error deleting quick win from Firestore:", err);
    }
  };

  // Colors & Helpers
  const getPriorityBadgeColor = (p: 'High' | 'Medium' | 'Low') => {
    switch (p) {
      case 'High':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 ring-rose-600/10 dark:ring-rose-500/20 border border-rose-200/50 dark:border-rose-800/40';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 ring-amber-600/10 dark:ring-amber-500/20 border border-amber-200/50 dark:border-amber-800/40';
      case 'Low':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ring-emerald-600/10 dark:ring-emerald-500/20 border border-emerald-200/50 dark:border-emerald-800/40';
    }
  };

  const isOverdue = (dateStr: string | null | undefined, currentStatus: string) => {
    if (!dateStr || currentStatus === 'Done') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Top Header & Stats */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-500 animate-pulse" />
              Quick Wins & Frontline Projects
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lightweight task tracking, immediate problem-solving, and continuous process improvements.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md shadow-indigo-600/10 dark:shadow-indigo-500/20 transition-all active:scale-95 duration-150"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Quick Win
          </button>
        </div>

        {/* Stats Summary Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <CheckSquare size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Active Wins</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.active}</p>
            </div>
          </div>

          <div className="glass p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg">
              <AlertCircle size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-sans">On-site Solved</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.problemSolvingSolved}</p>
            </div>
          </div>

          <div className="glass p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Process Improved</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.processImproved}</p>
            </div>
          </div>

          <div className="glass p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Completion Rate</span>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.completionRate}%</p>
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar (Filters + View Toggles) */}
      <div className="flex-shrink-0 p-3 bg-white/20 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search wins, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Categories</option>
            <option value="On-site Issue Solving">On-site Issue Solving</option>
            <option value="Process Improvement">Process Improvement</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Departments</option>
            {masterData.departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Assignees</option>
            {uniqueAssignees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Due Date Range Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-slate-700 dark:text-slate-300">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Due:</span>
            <input
              type="date"
              value={dueDateStart}
              onChange={(e) => setDueDateStart(e.target.value)}
              className="bg-transparent text-xs outline-none focus:ring-0 max-w-[105px] border-none p-0 text-slate-700 dark:text-slate-300"
            />
            <span className="text-slate-300 dark:text-slate-850 font-bold">-</span>
            <input
              type="date"
              value={dueDateEnd}
              onChange={(e) => setDueDateEnd(e.target.value)}
              className="bg-transparent text-xs outline-none focus:ring-0 max-w-[105px] border-none p-0 text-slate-700 dark:text-slate-300"
            />
            {(dueDateStart || dueDateEnd) && (
              <button
                onClick={() => { setDueDateStart(''); setDueDateEnd(''); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 transition-colors"
                title="Clear date range"
              >
                <X size={10} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl self-end md:self-auto flex-shrink-0">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Kanban size={13} />
            Board
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <List size={13} />
            Table
          </button>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 overflow-auto p-4 bg-slate-50/50 dark:bg-slate-950/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredQuickWins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-6">
            <HelpCircle size={40} className="text-slate-300 dark:text-slate-700 mb-2 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Quick Wins found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add your first small project, frontline troubleshoot task, or process improvement issue.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              Add Project
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          /* ========================================================
             KANBAN VIEW
             ======================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full items-start">
            {/* Columns definition */}
            {(['Backlog', 'In Progress', 'Review', 'Done'] as const).map(colStatus => {
              const colWins = filteredQuickWins.filter(w => w.status === colStatus);

              // Column styles
              let colDotColor = 'bg-slate-400';
              if (colStatus === 'In Progress') {
                colDotColor = 'bg-indigo-500';
              } else if (colStatus === 'Review') {
                colDotColor = 'bg-amber-500';
              } else if (colStatus === 'Done') {
                colDotColor = 'bg-emerald-500';
              }

              return (
                <div 
                  key={colStatus} 
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, colStatus)}
                  className="flex flex-col max-h-full rounded-2xl glass p-3 border-t-4 border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200"
                >
                  {/* Column Header */}
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/50 dark:border-slate-800/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colDotColor}`} />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{colStatus}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {colWins.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-320px)] custom-scrollbar">
                    {colWins.map(win => {
                      const overdue = isOverdue(win.dueDate, win.status);

                      return (
                        <div
                          key={win.id}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, win.id)}
                          onDoubleClick={() => handleOpenEdit(win)}
                          className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all group duration-200 relative animate-in fade-in duration-100"
                        >
                          {/* Top: Category & Priority */}
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                              win.category === 'On-site Issue Solving'
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950'
                            }`}>
                              {win.category === 'On-site Issue Solving' ? <Zap size={8} /> : <Sparkles size={8} />}
                              {win.category}
                            </span>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadgeColor(win.priority)}`}>
                              {win.priority}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {win.title}
                          </h4>

                          {/* Description */}
                          {win.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {win.description}
                            </p>
                          )}

                          {/* Middle: Requester & Department info */}
                          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-2 text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="truncate max-w-[110px]" title={`Requester: ${win.requester}`}>
                              Req: <span className="font-medium text-slate-600 dark:text-slate-400">{win.requester || 'N/A'}</span>
                            </span>
                            <span className="truncate max-w-[110px] flex items-center gap-1">
                              <Building2 size={10} />
                              {win.department || 'N/A'}
                            </span>
                          </div>

                          {/* Financial / Manpower metrics */}
                          {((win.valueRelease !== undefined && win.valueRelease !== null) || 
                            (win.manpowerSaving !== undefined && win.manpowerSaving !== null)) && (
                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-550 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800/30">
                              {win.valueRelease !== undefined && win.valueRelease !== null ? (
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  ฿{Number(win.valueRelease).toLocaleString()}
                                </span>
                              ) : <span />}
                              {win.manpowerSaving !== undefined && win.manpowerSaving !== null ? (
                                <span className="font-semibold text-indigo-650 dark:text-indigo-400">
                                  {Number(win.manpowerSaving).toLocaleString()} Hr/yr
                                </span>
                              ) : <span />}
                            </div>
                          )}

                          {/* Bottom: Assignee (Leader/Assignee) & Due Date */}
                          <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/40">
                            <div className="flex items-center gap-1.5 min-w-0" title={`Assignee/Leader: ${win.assignee}`}>
                              <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                  {win.assignee ? win.assignee.charAt(0) : '?'}
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">
                                {win.assignee}
                              </span>
                            </div>

                            {win.dueDate ? (
                              <span className={`text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                overdue
                                  ? 'bg-rose-500/10 text-rose-500 animate-pulse font-bold'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                <Calendar size={10} />
                                {win.dueDate}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Calendar size={10} />
                                No due date
                              </span>
                            )}
                          </div>

                          {/* Corner Actions: Edit, Delete */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                            {/* Edit */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(win); }}
                              className="p-1 bg-white/95 dark:bg-slate-800/95 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md hover:scale-115 transition-all cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 size={12} />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirmId(win.id); }}
                              className="p-1 bg-white/95 dark:bg-slate-800/95 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md hover:scale-115 transition-all cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Inline Delete Confirmation Dialog (Stage 1) */}
                          {showDeleteConfirmId === win.id && (
                            <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-2 rounded-xl z-20">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 text-center mb-2">Delete this Quick Win?</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirmId(null);
                                    setShowDoubleDeleteConfirmId(win.id);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirmId(null);
                                  }}
                                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================
             TABLE/LIST VIEW
             ======================================================== */
          <div className="glass rounded-2xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold border-b border-slate-200 dark:border-slate-850">
                    <th className="p-3">Status</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Assignee / Leader</th>
                    <th className="p-3">Requester</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Value (฿)</th>
                    <th className="p-3">Manpower (Hr/yr)</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredQuickWins.map((win) => {
                    const overdue = isOverdue(win.dueDate, win.status);

                    let statusDot = 'bg-slate-400';
                    if (win.status === 'In Progress') statusDot = 'bg-indigo-500';
                    else if (win.status === 'Review') statusDot = 'bg-amber-500';
                    else if (win.status === 'Done') statusDot = 'bg-emerald-500';

                    return (
                      <tr key={win.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-slate-700 dark:text-slate-300 transition-colors">
                        {/* Status */}
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                            {win.status}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
                            win.category === 'On-site Issue Solving'
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}>
                            {win.category}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate" title={win.title}>
                          {win.title}
                          {win.description && (
                            <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {win.description}
                            </p>
                          )}
                        </td>

                        {/* Assignee / Leader */}
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {win.assignee}
                        </td>

                        {/* Requester */}
                        <td className="p-3">{win.requester || '-'}</td>

                        {/* Department */}
                        <td className="p-3 font-medium">{win.department || '-'}</td>

                        {/* Priority */}
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getPriorityBadgeColor(win.priority)}`}>
                            {win.priority}
                          </span>
                        </td>

                        {/* Value Release */}
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {win.valueRelease !== undefined && win.valueRelease !== null
                            ? `฿${Number(win.valueRelease).toLocaleString()}`
                            : '-'}
                        </td>

                        {/* Manpower Saving */}
                        <td className="p-3 font-semibold text-indigo-650 dark:text-indigo-400">
                          {win.manpowerSaving !== undefined && win.manpowerSaving !== null
                            ? `${Number(win.manpowerSaving).toLocaleString()}`
                            : '-'}
                        </td>

                        {/* Due Date */}
                        <td className="p-3 font-mono">
                          <span className={overdue ? 'text-rose-500 font-bold' : ''}>
                            {win.dueDate || '-'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleOpenEdit(win)}
                              className="p-1 hover:text-indigo-500 text-slate-400 transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirmId(win.id)}
                              className="p-1 hover:text-rose-500 text-slate-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Delete modal overlay for Table Row */}
                          {showDeleteConfirmId === win.id && (
                            <div className="fixed inset-0 bg-slate-950/20 dark:bg-slate-950/40 backdrop-blur-[2px] z-50 flex items-center justify-center">
                              <div className="glass p-4 rounded-2xl max-w-xs w-full text-center shadow-lg animate-in zoom-in-95 duration-205">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">
                                  Delete this Quick Win?
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 truncate">
                                  "{win.title}"
                                </p>
                                <div className="flex justify-center gap-3">
                                  <button
                                    onClick={() => {
                                      setShowDeleteConfirmId(null);
                                      setShowDoubleDeleteConfirmId(win.id);
                                    }}
                                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirmId(null)}
                                    className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
         ADD / EDIT QUICK WIN FORM MODAL
         ======================================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          {/* Modal Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="h-4.5 w-4.5 text-indigo-500" />
                {editingQuickWin ? 'Edit Quick Win' : 'Add New Quick Win'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content - SCROLLABLE CONTENT */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter short title or issue description"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors(prev => { const n = {...prev}; delete n.title; return n; });
                    }}
                    className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.title ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'} text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                  {errors.title && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.title}</p>}
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value as any);
                        if (errors.category) setErrors(prev => { const n = {...prev}; delete n.category; return n; });
                      }}
                      className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.category ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'} text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer`}
                    >
                      <option value="">Select Category</option>
                      <option value="On-site Issue Solving">On-site Issue Solving</option>
                      <option value="Process Improvement">Process Improvement</option>
                    </select>
                    {errors.category && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Status <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as any);
                        if (errors.status) setErrors(prev => { const n = {...prev}; delete n.status; return n; });
                      }}
                      className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.status ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'} text-slate-850 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer`}
                    >
                      <option value="">Select Status</option>
                      <option value="Backlog">Backlog</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Done">Done</option>
                    </select>
                    {errors.status && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.status}</p>}
                  </div>
                </div>

                {/* Assignee/Leader */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                    <span>Assignee / Leader <span className="text-rose-500">*</span></span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomAssignee(!isCustomAssignee);
                        if (!isCustomAssignee) {
                          setAssignee('__custom__');
                        } else {
                          setAssignee(masterData.leaders[0] || '');
                        }
                      }}
                      className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      {isCustomAssignee ? 'Select from list' : 'Type custom name'}
                    </button>
                  </label>

                  {isCustomAssignee ? (
                    <input
                      type="text"
                      placeholder="Type custom name"
                      value={customAssigneeText}
                      onChange={(e) => {
                        setCustomAssigneeText(e.target.value);
                        if (errors.assignee) setErrors(prev => { const n = {...prev}; delete n.assignee; return n; });
                      }}
                      className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.assignee ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'} text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    />
                  ) : (
                    <select
                      value={assignee}
                      onChange={(e) => {
                        setAssignee(e.target.value);
                        if (errors.assignee) setErrors(prev => { const n = {...prev}; delete n.assignee; return n; });
                      }}
                      className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.assignee ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'} text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer`}
                    >
                      <option value="">Select Leader</option>
                      {masterData.leaders.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  )}
                  {errors.assignee && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.assignee}</p>}
                </div>

                {/* Requester & Department */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Requester
                    </label>
                    <input
                      type="text"
                      placeholder="Who requested this?"
                      value={requester}
                      onChange={(e) => setRequester(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                      <span>Department</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDept(!isCustomDept);
                          if (!isCustomDept) {
                            setDepartment('__custom__');
                          } else {
                            setDepartment(masterData.departments[0] || '');
                          }
                        }}
                        className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        {isCustomDept ? 'Select' : 'Type custom'}
                      </button>
                    </label>

                    {isCustomDept ? (
                      <input
                        type="text"
                        placeholder="Type department"
                        value={customDeptText}
                        onChange={(e) => {
                          setCustomDeptText(e.target.value);
                          if (errors.department) setErrors(prev => { const n = {...prev}; delete n.department; return n; });
                        }}
                        className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.department ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'} text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                      />
                    ) : (
                      <select
                        value={department}
                        onChange={(e) => {
                          setDepartment(e.target.value);
                          if (errors.department) setErrors(prev => { const n = {...prev}; delete n.department; return n; });
                        }}
                        className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.department ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'} text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer`}
                      >
                        <option value="">Select Dept</option>
                        {masterData.departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    )}
                    {errors.department && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.department}</p>}
                  </div>
                </div>

                {/* Priority & Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Priority <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => {
                        setPriority(e.target.value as any);
                        if (errors.priority) setErrors(prev => { const n = {...prev}; delete n.priority; return n; });
                      }}
                      className={`w-full bg-slate-50 dark:bg-slate-950 border ${errors.priority ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'} text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer`}
                    >
                      <option value="">Select Priority</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                    {errors.priority && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.priority}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Value Release & Manpower Saving */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Value Release (Baht)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 150000"
                      value={valueRelease}
                      onChange={(e) => setValueRelease(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Manpower Saving (Hr./year)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 120"
                      value={manpowerSaving}
                      onChange={(e) => setManpowerSaving(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about this task or issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer - FIXED BUTTONS AT BOTTOM (as requested by user) */}
              <div className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all active:scale-95 duration-100"
                >
                  {editingQuickWin ? 'Save Changes' : 'Create Quick Win'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
         DOUBLE PROTECTION DELETE CONFIRMATION MODAL (Stage 2)
         ======================================================== */}
      {showDoubleDeleteConfirmId && (() => {
        const win = quickWins.find(w => w.id === showDoubleDeleteConfirmId);
        if (!win) return null;
        return (
          <div className="fixed inset-0 z-[100] bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800">
                <AlertCircle size={24} className="animate-bounce" />
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                ⚠️ Double Protection Warning!
              </h3>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Are you absolutely sure you want to permanently delete <br/>
                <span className="font-semibold text-slate-900 dark:text-white">"{win.title}"</span>? <br/>
                This action is irreversible and the project data will be lost.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDoubleDeleteConfirmId(null)}
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(win.id)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                >
                  Yes, Permanently Delete!
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default QuickWinsBoard;
