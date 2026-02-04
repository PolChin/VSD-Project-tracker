
import React, { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, getDocs } from '../firebase';
import { Project, ProjectHistory } from '../types';
import { History, ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';

interface VarianceUIProps {
  projects: Project[];
}

const VarianceUI: React.FC<VarianceUIProps> = ({ projects }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [history, setHistory] = useState<ProjectHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'projects_history'), 
          where('projectId', '==', selectedProjectId),
          orderBy('updatedAt', 'desc')
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ProjectHistory[]);
      } catch (err) {
        console.error("History fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedProjectId]);

  return (
    <div className="space-y-8">
      <div className="bg-white/80 glass rounded-[2.5rem] p-8 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Variance Analysis</h3>
              <p className="text-sm text-slate-500 font-medium">Comparing snapshot deltas across iterations</p>
            </div>
          </div>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full md:w-80 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-bold appearance-none shadow-sm"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center animate-pulse text-indigo-600 font-bold uppercase tracking-widest">
          Scanning Temporal Database...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {history.length > 1 ? history.map((snapshot, idx) => {
            const previous = history[idx + 1];
            const delta = previous ? snapshot.progress - previous.progress : 0;
            const date = snapshot.updatedAt?.toDate() || new Date();

            return (
              <div key={snapshot.id} className="bg-white/80 glass rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-2xl font-black text-slate-800">{date.getDate()}</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Iteration Timestamp</div>
                    <div className="text-sm font-black text-slate-700">{date.toLocaleTimeString()} - {snapshot.status}</div>
                  </div>
                </div>

                <div className="flex items-center gap-12 flex-grow justify-center">
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Progress</div>
                    <div className="text-4xl font-black text-slate-800">{snapshot.progress}%</div>
                  </div>
                  
                  {previous && (
                    <div className={`flex flex-col items-center p-4 rounded-3xl ${
                      delta > 0 ? 'bg-emerald-50 text-emerald-600' : 
                      delta < 0 ? 'bg-rose-50 text-rose-600' : 
                      'bg-slate-50 text-slate-400'
                    }`}>
                      <div className="text-[10px] font-black uppercase mb-1">Delta</div>
                      <div className="flex items-center gap-1 text-2xl font-black">
                        {delta > 0 ? <ArrowUpRight size={24} /> : delta < 0 ? <ArrowDownRight size={24} /> : <Minus size={24} />}
                        {Math.abs(delta)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden md:block w-32">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${snapshot.progress}%` }} />
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-4">
              <AlertCircle size={48} className="text-slate-300" />
              <p className="text-slate-500 font-medium">Insufficient snapshot data for comparison. Deploy more updates to see variance.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VarianceUI;
