import { useEffect, useState } from 'react';
import { getPocketBase, isAuthenticated } from '@/lib/pocketbase';
import type { Asiakas, Projekti } from '@/lib/types';

export default function Raportit() {
  const [asiakkaat, setAsiakkaat] = useState<Asiakas[]>([]);
  const [projektit, setProjektit] = useState<Projekti[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    const pb = getPocketBase();
    Promise.all([
      pb.collection('asiakkaat').getFullList<Asiakas>({ requestKey: null }),
      pb.collection('projektit').getFullList<Projekti>({ requestKey: null }),
    ])
      .then(([asis, projs]) => {
        setAsiakkaat(asis);
        setProjektit(projs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-muted text-center py-8">Ladataan tilastoja…</p>;
  }

  const now = new Date();

  // Hit rate
  const won = asiakkaat.filter((a) => a.status === 'Kauppa').length;
  const lost = asiakkaat.filter((a) => a.status === 'Hävisi').length;
  const hitRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  // Pipeline by stage
  const stages = ['Uusi', 'Tarjous', 'Kauppa', 'Hävisi'] as const;
  const byStage = stages.map((status) => ({
    status,
    count: asiakkaat.filter((a) => a.status === status).length,
  }));

  const stageColors: Record<string, string> = {
    Uusi: 'var(--color-neon-cyan)',
    Tarjous: 'var(--color-neon-magenta)',
    Kauppa: 'var(--color-neon-green)',
    Hävisi: '#f87171',
  };

  // Pipeline value (Uusi + Tarjous customers)
  const activeIds = new Set(
    asiakkaat.filter((a) => a.status === 'Uusi' || a.status === 'Tarjous').map((a) => a.id)
  );
  const pipelineValue = projektit
    .filter((p) => activeIds.has(p.asiakas))
    .reduce((sum, p) => sum + (p.hinta ?? 0), 0);

  // Won value
  const wonIds = new Set(asiakkaat.filter((a) => a.status === 'Kauppa').map((a) => a.id));
  const wonValue = projektit
    .filter((p) => wonIds.has(p.asiakas))
    .reduce((sum, p) => sum + (p.hinta ?? 0), 0);

  // Average deal
  const validPrices = projektit.filter((p) => p.hinta > 0);
  const avgDeal =
    validPrices.length > 0
      ? Math.round(validPrices.reduce((s, p) => s + p.hinta, 0) / validPrices.length)
      : 0;

  // Monthly forecast
  const thisMonthProjects = projektit.filter((p) => {
    if (!p.deadline) return false;
    const d = new Date(p.deadline);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthlyForecast = thisMonthProjects.reduce((s, p) => s + (p.hinta ?? 0), 0);
  const monthName = now.toLocaleDateString('fi-FI', { month: 'long' });

  // Churn risk: Uusi/Tarjous, not updated in 60+ days
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const churnRisk = asiakkaat
    .filter(
      (a) =>
        (a.status === 'Uusi' || a.status === 'Tarjous') &&
        new Date(a.updated) < sixtyDaysAgo
    )
    .sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime());

  // Lead source distribution
  const lahdeCounts: Record<string, number> = {};
  asiakkaat.forEach((a) => {
    const l = a.lahde || 'Tuntematon';
    lahdeCounts[l] = (lahdeCounts[l] ?? 0) + 1;
  });
  const lahdeEntries = Object.entries(lahdeCounts).sort((a, b) => b[1] - a[1]);
  const hasLahdeData = lahdeEntries.some(([k]) => k !== 'Tuntematon');

  // Segmentti distribution
  const segmenttiCounts: Record<string, number> = {};
  asiakkaat.forEach((a) => {
    const s = a.segmentti || 'Ei segmenttiä';
    segmenttiCounts[s] = (segmenttiCounts[s] ?? 0) + 1;
  });
  const segmenttiEntries = Object.entries(segmenttiCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card">
          <p className="text-slate-muted text-xs mb-1">Hit rate</p>
          <p className="text-2xl font-bold neon-text-cyan">
            {hitRate !== null ? `${hitRate}%` : '—'}
          </p>
          <p className="text-xs text-slate-muted mt-0.5">{won} voitettu / {lost} hävitty</p>
        </div>
        <div className="glass-card">
          <p className="text-slate-muted text-xs mb-1">Pipeline-arvo</p>
          <p className="text-2xl font-bold text-[var(--color-neon-cyan)]">
            {pipelineValue.toLocaleString('fi-FI')} €
          </p>
          <p className="text-xs text-slate-muted mt-0.5">Uusi + Tarjous</p>
        </div>
        <div className="glass-card">
          <p className="text-slate-muted text-xs mb-1">Voitettu arvo</p>
          <p className="text-2xl font-bold text-[var(--color-neon-green)]">
            {wonValue.toLocaleString('fi-FI')} €
          </p>
          <p className="text-xs text-slate-muted mt-0.5">Kauppa-asiakkaat</p>
        </div>
        <div className="glass-card">
          <p className="text-slate-muted text-xs mb-1">Keskikauppa</p>
          <p className="text-2xl font-bold text-slate-light">
            {avgDeal.toLocaleString('fi-FI')} €
          </p>
          <p className="text-xs text-slate-muted mt-0.5">{projektit.length} projektia yhteensä</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly forecast */}
        <div className="glass-card">
          <h3 className="font-semibold neon-text-cyan mb-3">Ennuste — {monthName}</h3>
          <p className="text-3xl font-bold text-[var(--color-neon-green)] mb-1">
            {monthlyForecast.toLocaleString('fi-FI')} €
          </p>
          <p className="text-xs text-slate-muted mb-3">
            {thisMonthProjects.length} projektia deadlinella tässä kuussa
          </p>
          {thisMonthProjects.length > 0 && (
            <ul className="space-y-1">
              {thisMonthProjects.map((p) => (
                <li key={p.id} className="flex justify-between text-xs">
                  <span className="text-slate-light">{p.name}</span>
                  <span className="text-[var(--color-neon-green)]">
                    {(p.hinta ?? 0).toLocaleString('fi-FI')} €
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pipeline by stage */}
        <div className="glass-card">
          <h3 className="font-semibold neon-text-cyan mb-3">Putki vaiheittain</h3>
          <div className="space-y-3">
            {byStage.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="text-sm text-slate-muted w-20 shrink-0">{s.status}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: asiakkaat.length > 0 ? `${(s.count / asiakkaat.length) * 100}%` : '0%',
                      background: stageColors[s.status],
                    }}
                  />
                </div>
                <span className="text-sm text-slate-light w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-muted mt-3">{asiakkaat.length} asiakasta yhteensä</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Churn risk */}
        <div className="glass-card">
          <h3 className="font-semibold text-amber-400 mb-1">Churn-riski</h3>
          <p className="text-xs text-slate-muted mb-3">
            Ei kontaktoitu 60+ päivään (Uusi tai Tarjous)
          </p>
          {churnRisk.length === 0 ? (
            <p className="text-[var(--color-neon-green)] text-sm">Ei churn-riskiä — hyvä tilanne!</p>
          ) : (
            <div className="space-y-2">
              {churnRisk.map((a) => {
                const days = Math.floor(
                  (now.getTime() - new Date(a.updated).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3">
                    <div>
                      <a
                        href={`/dashboard/asiakas/${a.id}`}
                        className="text-sm text-slate-light hover:text-[var(--color-neon-cyan)] transition-colors"
                      >
                        {a.name}
                      </a>
                      <p className="text-xs text-slate-muted">{a.status}</p>
                    </div>
                    <span className="text-xs text-red-400 shrink-0">{days} pv sitten</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lead source */}
        <div className="glass-card">
          <h3 className="font-semibold neon-text-magenta mb-3">Liidit lähteittäin</h3>
          {!hasLahdeData ? (
            <p className="text-slate-muted text-sm">
              Ei lähteitä kirjattu. Lisää asiakkaille lähde asiakaskortilla.
            </p>
          ) : (
            <div className="space-y-2">
              {lahdeEntries.map(([lahde, count]) => (
                <div key={lahde} className="flex items-center gap-3">
                  <span className="text-sm text-slate-muted w-28 shrink-0 truncate">{lahde}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[var(--color-neon-magenta)] transition-all"
                      style={{ width: `${(count / asiakkaat.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-light w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Segmentti distribution */}
      <div className="glass-card">
        <h3 className="font-semibold neon-text-cyan mb-3">Asiakkaat segmenteittäin</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {segmenttiEntries.map(([seg, count]) => (
            <div key={seg} className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
              <p className="text-2xl font-bold text-slate-light">{count}</p>
              <p className="text-xs text-slate-muted mt-1">{seg}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
