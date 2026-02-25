import { useEffect, useState } from 'react';
import { getPocketBase, isAuthenticated } from '@/lib/pocketbase';
import type { Projekti, ProjektiStatus, Asiakas } from '@/lib/types';
import ProjektiForm from './ProjektiForm';

const COLUMNS: { id: ProjektiStatus; label: string; color: string }[] = [
  { id: 'Uusi', label: 'Uusi', color: 'var(--color-neon-cyan)' },
  { id: 'Yhteydenotto', label: 'Yhteydenotto', color: '#60a5fa' }, // blue-400
  { id: 'Tarjous', label: 'Tarjous', color: 'var(--color-neon-magenta)' },
  { id: 'Neuvottelu', label: 'Neuvottelu', color: '#fbbf24' }, // amber-400
  { id: 'Voitettu', label: 'Voitettu', color: 'var(--color-neon-green)' },
  { id: 'Hävinnyt', label: 'Hävinnyt', color: '#f87171' }, // red-400
];

function ProjectCard({
  projekti,
  onEdit,
  onDelete,
  onDragStart,
}: {
  projekti: Projekti;
  onEdit: (p: Projekti) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
}) {
  const asiakasNimi = projekti.expand?.asiakas?.name ?? '—';
  const hinta = projekti.hinta ? `${projekti.hinta.toFixed(2)} €` : '—';
  const deadline = projekti.deadline ? new Date(projekti.deadline).toLocaleDateString('fi-FI') : '';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(projekti.id);
      }}
      className="glass-card rounded-lg p-3 border border-white/5 hover:border-[var(--color-neon-cyan)]/20 transition-colors cursor-grab active:cursor-grabbing select-none flex flex-col gap-1"
    >
      <div className="font-medium text-slate-light hover:text-[var(--color-neon-cyan)] transition-colors truncate">
        {projekti.name}
      </div>
      <div className="text-xs text-slate-muted truncate flex items-center gap-1">
        <span className="opacity-70">Asiakas:</span> {asiakasNimi}
      </div>
      <div className="flex justify-between items-center mt-1">
        <div className="text-xs font-semibold text-[var(--color-neon-green)]">{hinta}</div>
        {deadline && <div className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{deadline}</div>}
      </div>
      
      <div className="flex gap-3 mt-2 pt-2 border-t border-white/5">
        <button
          onClick={() => onEdit(projekti)}
          className="text-xs text-[var(--color-neon-magenta)] hover:opacity-80 transition-opacity"
        >
          Muokkaa
        </button>
        <button
          onClick={() => onDelete(projekti.id)}
          className="text-xs text-red-400 hover:opacity-80 transition-opacity"
        >
          Poista
        </button>
      </div>
    </div>
  );
}

export default function PipelineBoard() {
  const [projektit, setProjektit] = useState<Projekti[]>([]);
  const [asiakkaat, setAsiakkaat] = useState<Asiakas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Projekti | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ProjektiStatus | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    const pb = getPocketBase();
    Promise.all([
      pb.collection('projektit').getFullList<Projekti>({ expand: 'asiakas', sort: '-created' }),
      pb.collection('asiakkaat').getFullList<Asiakas>({ sort: 'name' })
    ])
      .then(([projList, asiakasList]) => {
        setProjektit(projList);
        setAsiakkaat(asiakasList);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError('Tietojen haku epäonnistui');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: ProjektiStatus) {
    const pb = getPocketBase();
    try {
      await pb.collection('projektit').update(id, { status });
      setProjektit((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Poistetaanko projekti?')) return;
    try {
      await getPocketBase().collection('projektit').delete(id);
      setProjektit((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function handleSave(saved: Projekti) {
    // If we just saved, we might need to re-fetch to get the expanded 'asiakas' relation 
    // or manually patch it if we know the asiakas object.
    // For simplicity, let's just patch it with the known asiakas from our list.
    const asiakasObj = asiakkaat.find(a => a.id === saved.asiakas);
    const savedWithExpand = { ...saved, expand: { asiakas: asiakasObj! } };

    setProjektit((prev) =>
      prev.find((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? savedWithExpand : p))
        : [savedWithExpand, ...prev]
    );
    setShowAdd(false);
    setEditTarget(null);
  }

  function handleDrop(colId: ProjektiStatus) {
    if (draggedId && draggedId !== projektit.find((p) => p.id === draggedId && p.status === colId)?.id) {
      handleStatusChange(draggedId, colId);
    }
    setDraggedId(null);
    setDragOverCol(null);
  }

  if (loading) return <div className="text-slate-muted text-center py-8">Ladataan pipelinea…</div>;
  if (error) return <div className="text-red-400 text-center py-8">{error}</div>;

  const byStatus = (status: ProjektiStatus) => projektit.filter((p) => (p.status || 'Uusi') === status);

  const totalValue = (status: ProjektiStatus) => 
    byStatus(status).reduce((acc, curr) => acc + (curr.hinta || 0), 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
           <h2 className="text-xl font-bold text-slate-light">Myyntiputki</h2>
           <p className="text-sm text-slate-muted">Hallinnoi projekteja ja kauppoja</p>
        </div>
        
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm px-4 py-2 rounded-lg bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/40 hover:bg-[var(--color-neon-cyan)]/30 hover:border-[var(--color-neon-cyan)]/60 transition-all active:scale-[0.98] font-semibold"
        >
          + Uusi projekti
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
        {COLUMNS.map((col) => {
          const isOver = dragOverCol === col.id;
          const items = byStatus(col.id);
          const sum = totalValue(col.id);
          
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.id)}
              className={`glass rounded-xl p-3 border flex-shrink-0 w-[280px] flex flex-col gap-3 transition-colors ${
                isOver ? 'border-[var(--color-neon-cyan)]/50 bg-white/[0.04]' : 'border-white/5 bg-black/20'
              }`}
            >
              <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                <h3
                  className="font-bold flex items-center justify-between"
                  style={{ color: col.color }}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: col.color }} />
                    {col.label}
                  </span>
                  <span className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-slate-300">{items.length}</span>
                </h3>
                {sum > 0 && (
                   <div className="text-xs text-slate-400 font-mono text-right">
                     Yht: {sum.toFixed(0)} €
                   </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[100px]">
                {items.map((projekti) => (
                  <ProjectCard
                    key={projekti.id}
                    projekti={projekti}
                    onEdit={setEditTarget}
                    onDelete={handleDelete}
                    onDragStart={setDraggedId}
                  />
                ))}
                {items.length === 0 && !isOver && (
                  <div className="text-center py-8 text-slate-700 text-xs italic">
                    Ei projekteja
                  </div>
                )}
                {isOver && (
                  <div className="h-20 rounded-lg border-2 border-dashed border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/5 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(showAdd || editTarget) && (
        <ProjektiForm
          projekti={editTarget ?? undefined}
          asiakkaat={asiakkaat}
          onSave={handleSave}
          onClose={() => { setShowAdd(false); setEditTarget(null); }}
        />
      )}
    </>
  );
}
