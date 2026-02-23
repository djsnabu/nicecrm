import { useEffect, useState } from 'react';
import { getPocketBase, isAuthenticated } from '@/lib/pocketbase';
import type { Asiakas, AsiakasSegmentti, AsiakasStatus } from '@/lib/types';
import AsiakasForm from './AsiakasForm';
import CSVImport from './CSVImport';

const COLUMNS: { id: AsiakasStatus; label: string; color: string }[] = [
  { id: 'Uusi', label: 'Uusi', color: 'var(--color-neon-cyan)' },
  { id: 'Tarjous', label: 'Tarjous', color: 'var(--color-neon-magenta)' },
  { id: 'Kauppa', label: 'Kauppa', color: 'var(--color-neon-green)' },
  { id: 'Hävisi', label: 'Hävisi', color: '#f87171' },
];

const SEGMENTIT: AsiakasSegmentti[] = ['A-ryhmä', 'B-ryhmä', 'C-ryhmä', 'Passiivinen', 'Potentiaalinen'];

const segmenttiVari: Record<string, string> = {
  'A-ryhmä': 'text-[var(--color-neon-green)]',
  'B-ryhmä': 'text-[var(--color-neon-cyan)]',
  'C-ryhmä': 'text-slate-muted',
  'Passiivinen': 'text-slate-muted',
  'Potentiaalinen': 'text-[var(--color-neon-magenta)]',
};

function CustomerCard({
  asiakas,
  onEdit,
  onDelete,
  onDragStart,
}: {
  asiakas: Asiakas;
  onEdit: (a: Asiakas) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(asiakas.id);
      }}
      className="glass-card rounded-lg p-3 border border-white/5 hover:border-[var(--color-neon-cyan)]/20 transition-colors cursor-grab active:cursor-grabbing select-none"
    >
      <a
        href={`/dashboard/asiakas/${asiakas.id}`}
        className="font-medium text-slate-light hover:text-[var(--color-neon-cyan)] transition-colors block"
        onClick={(e) => e.stopPropagation()}
      >
        {asiakas.name}
      </a>
      <p className="text-xs text-slate-muted truncate">{asiakas.email}</p>
      {asiakas.phone && <p className="text-xs text-slate-muted">{asiakas.phone}</p>}
      {asiakas.segmentti && (
        <p className={`text-xs mt-1 ${segmenttiVari[asiakas.segmentti] ?? 'text-slate-muted'}`}>
          {asiakas.segmentti}
        </p>
      )}
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => onEdit(asiakas)}
          className="text-xs text-[var(--color-neon-magenta)] hover:opacity-80 transition-opacity"
        >
          Muokkaa
        </button>
        <button
          onClick={() => onDelete(asiakas.id)}
          className="text-xs text-red-400 hover:opacity-80 transition-opacity"
        >
          Poista
        </button>
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const [customers, setCustomers] = useState<Asiakas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Asiakas | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<AsiakasStatus | null>(null);
  const [filterSegmentti, setFilterSegmentti] = useState<string>('');
  const [showCSV, setShowCSV] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    const pb = getPocketBase();
    pb.collection('asiakkaat')
      .getFullList<Asiakas>({ requestKey: null })
      .then((list) => {
        setCustomers(list);
        setError(null);
      })
      .catch((err) => setError(err?.message ?? 'Asiakkaiden haku epäonnistui'))
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: AsiakasStatus) {
    const pb = getPocketBase();
    try {
      await pb.collection('asiakkaat').update(id, { status });
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Poistetaanko asiakas?')) return;
    try {
      await getPocketBase().collection('asiakkaat').delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function handleSave(saved: Asiakas) {
    setCustomers((prev) =>
      prev.find((c) => c.id === saved.id)
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [...prev, saved]
    );
    setShowAdd(false);
    setEditTarget(null);
  }

  function handleDrop(colId: AsiakasStatus) {
    if (draggedId && draggedId !== customers.find((c) => c.id === draggedId && c.status === colId)?.id) {
      handleStatusChange(draggedId, colId);
    }
    setDraggedId(null);
    setDragOverCol(null);
  }

  if (loading) {
    return <div className="text-slate-muted text-center py-8">Ladataan asiakkaita…</div>;
  }
  if (error) {
    return <div className="text-red-400 text-center py-8">{error}</div>;
  }

  const filtered = filterSegmentti
    ? customers.filter((c) => c.segmentti === filterSegmentti)
    : customers;

  const byStatus = (status: AsiakasStatus) =>
    filtered.filter((c) => c.status === status);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-light">Asiakkaat</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterSegmentti}
            onChange={(e) => setFilterSegmentti(e.target.value)}
            className="text-xs rounded-lg bg-black/30 border border-white/10 text-slate-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)] px-2 py-1.5"
          >
            <option value="">Kaikki segmentit</option>
            {SEGMENTIT.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCSV(true)}
            className="text-sm px-3 py-1.5 rounded-lg bg-white/5 text-slate-muted border border-white/10 hover:border-white/20 hover:text-slate-light transition-colors"
          >
            Tuo CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm px-3 py-1.5 rounded-lg bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/40 hover:bg-[var(--color-neon-cyan)]/30 transition-colors"
          >
            + Lisää asiakas
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const isOver = dragOverCol === col.id;
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
              className={`glass rounded-xl p-4 border min-h-[200px] transition-colors ${
                isOver ? 'border-[var(--color-neon-cyan)]/50 bg-white/[0.04]' : 'border-white/5'
              }`}
            >
              <h3
                className="font-semibold mb-3 flex items-center justify-between"
                style={{ color: col.color }}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  {col.label}
                </span>
                <span className="text-xs font-normal text-slate-muted">{byStatus(col.id).length}</span>
              </h3>
              <div className="space-y-2">
                {byStatus(col.id).map((asiakas) => (
                  <CustomerCard
                    key={asiakas.id}
                    asiakas={asiakas}
                    onEdit={setEditTarget}
                    onDelete={handleDelete}
                    onDragStart={setDraggedId}
                  />
                ))}
                {isOver && (
                  <div className="h-10 rounded-lg border-2 border-dashed border-[var(--color-neon-cyan)]/30" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {(showAdd || editTarget) && (
        <AsiakasForm
          asiakas={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowAdd(false); setEditTarget(null); }}
        />
      )}
      {showCSV && (
        <CSVImport
          onImported={(uudet) => setCustomers((prev) => [...prev, ...uudet])}
          onClose={() => setShowCSV(false)}
        />
      )}
    </>
  );
}
