import { useEffect, useState } from 'react';
import { getPocketBase } from '@/lib/pocketbase';
import type { Asiakas, Muistutus } from '@/lib/types';

export default function MuistutusWidget() {
  const [muistutukset, setMuistutukset] = useState<Muistutus[]>([]);
  const [asiakasNimet, setAsiakasNimet] = useState<Map<string, string>>(new Map());
  const [ready, setReady] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const pb = getPocketBase();
    Promise.all([
      pb.collection('muistutukset').getFullList<Muistutus>({
        filter: 'tehty=false',
        sort: 'paivamaara',
        requestKey: null,
      }),
      pb.collection('asiakkaat').getFullList<Asiakas>({
        fields: 'id,name',
        requestKey: null,
      }),
    ])
      .then(([muist, asis]) => {
        setMuistutukset(muist);
        setAsiakasNimet(new Map(asis.map((a) => [a.id, a.name])));
        setReady(true);
      })
      .catch(() => {
        // Collection might not exist yet — widget stays hidden
        setReady(false);
      });
  }, []);

  async function markDone(id: string) {
    try {
      await getPocketBase().collection('muistutukset').update(id, { tehty: true });
      setMuistutukset((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  if (!ready || muistutukset.length === 0) return null;

  const now = new Date();
  const overdueCount = muistutukset.filter((m) => new Date(m.paivamaara) < now).length;
  const visible = showAll ? muistutukset : muistutukset.slice(0, 5);

  return (
    <div className="glass-card mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-amber-400 flex items-center gap-2">
          Muistutukset
          {overdueCount > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              {overdueCount} myöhässä
            </span>
          )}
        </h3>
        <span className="text-xs text-slate-muted">{muistutukset.length} avointa</span>
      </div>
      <div className="space-y-2">
        {visible.map((m) => {
          const isOverdue = new Date(m.paivamaara) < now;
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 p-2 rounded-lg border ${
                isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-black/10'
              }`}
            >
              <div className="flex-1 min-w-0">
                <a
                  href={`/dashboard/asiakas/${m.asiakas}`}
                  className="text-xs text-[var(--color-neon-cyan)] hover:opacity-80 transition-opacity"
                >
                  {asiakasNimet.get(m.asiakas) ?? 'Tuntematon asiakas'}
                </a>
                <p className="text-sm text-slate-light">{m.teksti}</p>
                <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-slate-muted'}`}>
                  {new Date(m.paivamaara).toLocaleDateString('fi-FI')}
                  {isOverdue && ' – myöhässä!'}
                </p>
              </div>
              <button
                onClick={() => markDone(m.id)}
                className="shrink-0 text-xs px-2 py-1 rounded bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)] border border-[var(--color-neon-green)]/30 hover:bg-[var(--color-neon-green)]/20 transition-colors"
              >
                Tehty
              </button>
            </div>
          );
        })}
      </div>
      {muistutukset.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-slate-muted hover:text-slate-light transition-colors"
        >
          {showAll ? 'Näytä vähemmän' : `Näytä kaikki (${muistutukset.length})`}
        </button>
      )}
    </div>
  );
}
