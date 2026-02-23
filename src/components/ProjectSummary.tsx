import { useEffect, useState } from 'react';
import { getPocketBase, isAuthenticated } from '@/lib/pocketbase';
import type { Asiakas, Projekti } from '@/lib/types';
import ProjektiForm from './ProjektiForm';

export default function ProjectSummary() {
  const [projects, setProjects] = useState<Projekti[]>([]);
  const [asiakkaat, setAsiakkaat] = useState<Asiakas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Projekti | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const pb = getPocketBase();
    Promise.all([
      pb.collection('projektit').getFullList<Projekti>({ requestKey: null }),
      pb.collection('asiakkaat').getFullList<Asiakas>({ fields: 'id,name', requestKey: null }),
    ])
      .then(([projs, asis]) => {
        setProjects(projs);
        setAsiakkaat(asis as Asiakas[]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Poistetaanko projekti?')) return;
    try {
      await getPocketBase().collection('projektit').delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function handleSave(saved: Projekti) {
    setProjects((prev) =>
      prev.find((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [...prev, saved]
    );
    setShowAdd(false);
    setEditTarget(null);
  }

  if (loading) {
    return <p className="text-slate-muted text-sm">Ladataan projekteja…</p>;
  }

  const now = new Date();
  const total = projects.reduce((sum, p) => sum + (p.hinta ?? 0), 0);

  // Monthly forecast: projects with deadline in current month
  const monthlyProjects = projects.filter((p) => {
    if (!p.deadline) return false;
    const d = new Date(p.deadline);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthlyForecast = monthlyProjects.reduce((sum, p) => sum + (p.hinta ?? 0), 0);

  const upcoming = projects
    .filter((p) => p.deadline && new Date(p.deadline) >= now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  const asiakasName = (id: string) =>
    asiakkaat.find((a) => a.id === id)?.name ?? '—';

  const monthName = now.toLocaleDateString('fi-FI', { month: 'long' });

  return (
    <>
      <div className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold neon-text-cyan">Projektit</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs px-2 py-1 rounded bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/40 hover:bg-[var(--color-neon-cyan)]/30 transition-colors"
          >
            + Lisää
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <p className="text-slate-muted text-xs">Aktiivisia</p>
            <p className="text-xl font-semibold text-slate-light">{projects.length}</p>
          </div>
          <div>
            <p className="text-slate-muted text-xs">Kokonaisarvo</p>
            <p className="text-xl font-semibold text-[var(--color-neon-green)]">
              {total.toLocaleString('fi-FI')} €
            </p>
          </div>
          <div>
            <p className="text-slate-muted text-xs">Ennuste ({monthName})</p>
            <p className="text-xl font-semibold text-amber-400">
              {monthlyForecast.toLocaleString('fi-FI')} €
            </p>
            {monthlyProjects.length > 0 && (
              <p className="text-xs text-slate-muted">{monthlyProjects.length} projektia</p>
            )}
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="mb-4">
            <p className="text-slate-muted text-xs mb-1">Lähimmät deadlinet</p>
            <ul className="space-y-0.5 text-xs text-slate-muted">
              {upcoming.map((p) => (
                <li key={p.id} className="flex gap-2">
                  <span className="text-slate-light truncate">{p.name}</span>
                  <span>{new Date(p.deadline).toLocaleDateString('fi-FI')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-muted text-xs border-b border-white/5">
                  <th className="text-left pb-2 font-medium">Projekti</th>
                  <th className="text-left pb-2 font-medium">Asiakas</th>
                  <th className="text-right pb-2 font-medium">Hinta</th>
                  <th className="text-left pb-2 font-medium pl-3">Deadline</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const isThisMonth =
                    p.deadline &&
                    new Date(p.deadline).getFullYear() === now.getFullYear() &&
                    new Date(p.deadline).getMonth() === now.getMonth();
                  return (
                    <tr key={p.id} className="border-b border-white/5 group hover:bg-white/[0.02]">
                      <td className="py-2 text-slate-light">
                        {p.name}
                        {isThisMonth && (
                          <span className="ml-2 text-xs text-amber-400/70">↗</span>
                        )}
                      </td>
                      <td className="py-2 text-slate-muted text-xs">{asiakasName(p.asiakas)}</td>
                      <td className="py-2 text-right text-[var(--color-neon-green)]">
                        {p.hinta ? `${p.hinta.toLocaleString('fi-FI')} €` : '—'}
                      </td>
                      <td className="py-2 pl-3 text-slate-muted text-xs">
                        {p.deadline ? new Date(p.deadline).toLocaleDateString('fi-FI') : '—'}
                      </td>
                      <td className="py-2 text-right">
                        <span className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditTarget(p)}
                            className="text-xs text-[var(--color-neon-magenta)] hover:opacity-80"
                          >
                            Muokkaa
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-red-400 hover:opacity-80"
                          >
                            Poista
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-muted text-sm">Ei projekteja vielä.</p>
        )}
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
