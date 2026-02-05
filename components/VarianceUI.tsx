
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
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })) as ProjectHistory[]);
      } catch (err) {
        console.error("History fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedProjectId]);

  return (
    <div className="space-y-4">
      <div className="bg-white/80 glass rounded-2xl p-4 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Variance Analysis</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Snapshot Delta Scanning</p>
            </div>
          </div>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full md:w-72 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center animate-pulse text-indigo-600 font-black text-[10px] uppercase tracking-widest">
          Scanning Temporal Snapshot Logs...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {history.length > 1 ? history.map((snapshot, idx) => {
            const previous = history[idx + 1];
            const delta = previous ? snapshot.progress - previous.progress : 0;
            const date = snapshot.updatedAt?.toDate() || new Date();

            return (
              <div key={snapshot.id} className="bg-white/80 glass rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/50 hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-xl font-black text-slate-800 leading-none">{date.getDate()}</span>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Iteration Node</div>
                    <div className="text-xs font-black text-slate-700">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {snapshot.status}</div>
                  </div>
                </div>

                <div className="flex items-center gap-10 flex-grow justify-center md:justify-end">
                  <div className="text-center">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Snapshot</div>
                    <div className="text-2xl font-black text-slate-800 leading-none">{snapshot.progress}%</div>
                  </div>
                  
                  {previous && (
                    <div className={`flex flex-col items-center p-2 rounded-xl min-w-[70px] ${
                      delta > 0 ? 'bg-emerald-50 text-emerald-600' : 
                      delta < 0 ? 'bg-rose-50 text-rose-600' : 
                      'bg-slate-50 text-slate-400'
                    }`}>
                      <div className="text-[8px] font-black uppercase mb-0.5 tracking-tighter">Delta</div>
                      <div className="flex items-center gap-0.5 text-lg font-black leading-none">
                        {delta > 0 ? <ArrowUpRight size={14} /> : delta < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                        {Math.abs(delta)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden md:block w-24">
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${snapshot.progress}%` }} />
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="bg-white/50 border border-dashed border-slate-300 rounded-2xl p-16 text-center flex flex-col items-center gap-3">
              <AlertCircle size={32} className="text-slate-300" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Deploy more updates to scan variance.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VarianceUI;
