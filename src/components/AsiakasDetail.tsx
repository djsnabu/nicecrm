import { useEffect, useState } from 'react';
import { getPocketBase, isAuthenticated } from '@/lib/pocketbase';
import type { Asiakas, Muistutus, Projekti } from '@/lib/types';
import AsiakasForm from './AsiakasForm';
import ProjektiForm from './ProjektiForm';
import AktiviteettiLog from './AktiviteettiLog';
import SahkopostiMallit from './SahkopostiMallit';

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)] focus:border-transparent text-sm';

interface Props {
  asiakasId: string;
}

export default function AsiakasDetail({ asiakasId }: Props) {
  const [asiakas, setAsiakas] = useState<Asiakas | null>(null);
  const [projektit, setProjektit] = useState<Projekti[]>([]);
  const [asiakkaat, setAsiakkaat] = useState<Asiakas[]>([]);
  const [muistutukset, setMuistutukset] = useState<Muistutus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editAsiakas, setEditAsiakas] = useState(false);
  const [showAddProjekti, setShowAddProjekti] = useState(false);
  const [editProjekti, setEditProjekti] = useState<Projekti | null>(null);
  const [showSahkoposti, setShowSahkoposti] = useState(false);

  // Muistutukset form state
  const [showMuistutusForm, setShowMuistutusForm] = useState(false);
  const [muistutusTeksti, setMuistutusTeksti] = useState('');
  const [muistutusPvm, setMuistutusPvm] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingMuistutus, setSavingMuistutus] = useState(false);
  const [muistutusCollectionMissing, setMuistutusCollectionMissing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    const pb = getPocketBase();
    Promise.all([
      pb.collection('asiakkaat').getOne<Asiakas>(asiakasId, { requestKey: null }),
      pb.collection('projektit').getFullList<Projekti>({ filter: `asiakas="${asiakasId}"`, requestKey: null }),
      pb.collection('asiakkaat').getFullList<Asiakas>({ fields: 'id,name', requestKey: null }),
      pb.collection('muistutukset')
        .getFullList<Muistutus>({ filter: `asiakas="${asiakasId}"`, sort: 'tehty,paivamaara', requestKey: null })
        .catch((err) => {
          if (err?.status === 404) setMuistutusCollectionMissing(true);
          return [] as Muistutus[];
        }),
    ])
      .then(([a, projs, asis, muist]) => {
        setAsiakas(a);
        setProjektit(projs);
        setAsiakkaat(asis as Asiakas[]);
        setMuistutukset(muist);
      })
      .catch((err) => setError(err?.message ?? 'Lataus epäonnistui'))
      .finally(() => setLoading(false));
  }, [asiakasId]);

  async function handleDeleteAsiakas() {
    if (!confirm('Poistetaanko asiakas? Tämä ei poista asiakkaan projekteja.')) return;
    try {
      await getPocketBase().collection('asiakkaat').delete(asiakasId);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteProjekti(id: string) {
    if (!confirm('Poistetaanko projekti?')) return;
    try {
      await getPocketBase().collection('projektit').delete(id);
      setProjektit((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddMuistutus(e: React.FormEvent) {
    e.preventDefault();
    setSavingMuistutus(true);
    try {
      const saved = await getPocketBase().collection('muistutukset').create<Muistutus>({
        asiakas: asiakasId,
        teksti: muistutusTeksti,
        paivamaara: muistutusPvm,
        tehty: false,
      });
      setMuistutukset((prev) => [...prev, saved]);
      setMuistutusTeksti('');
      setShowMuistutusForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMuistutus(false);
    }
  }

  async function handleMuistutusDone(id: string) {
    try {
      await getPocketBase().collection('muistutukset').update(id, { tehty: true });
      setMuistutukset((prev) => prev.map((m) => m.id === id ? { ...m, tehty: true } : m));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteMuistutus(id: string) {
    try {
      await getPocketBase().collection('muistutukset').delete(id);
      setMuistutukset((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function handleSaveAsiakas(saved: Asiakas) {
    setAsiakas(saved);
    setEditAsiakas(false);
  }

  function handleSaveProjekti(saved: Projekti) {
    setProjektit((prev) =>
      prev.find((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [...prev, saved]
    );
    setShowAddProjekti(false);
    setEditProjekti(null);
  }

  if (loading) {
    return <p className="text-slate-muted py-8 text-center">Ladataan…</p>;
  }
  if (error || !asiakas) {
    return <p className="text-red-400 py-8 text-center">{error ?? 'Asiakasta ei löydy.'}</p>;
  }

  const statusColors: Record<string, string> = {
    Uusi: 'text-[var(--color-neon-cyan)]',
    Tarjous: 'text-[var(--color-neon-magenta)]',
    Kauppa: 'text-[var(--color-neon-green)]',
    Hävisi: 'text-red-400',
  };

  const avoimet = muistutukset.filter((m) => !m.tehty);
  const tehdyt = muistutukset.filter((m) => m.tehty);
  const now = new Date();

  return (
    <>
      <div className="mb-6">
        <a
          href="/dashboard"
          className="text-sm text-slate-muted hover:text-[var(--color-neon-cyan)] transition-colors"
        >
          ← Takaisin dashboard
        </a>
      </div>

      {/* Asiakaskortti */}
      <div className="glass-card neon-border-cyan mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold neon-text-cyan mb-1">{asiakas.name}</h1>
            {asiakas.email && <p className="text-slate-muted text-sm">{asiakas.email}</p>}
            {asiakas.phone && <p className="text-slate-muted text-sm">{asiakas.phone}</p>}
            {(asiakas.kaupunki || asiakas.toimiala) && (
              <p className="text-slate-muted text-sm">
                {[asiakas.kaupunki, asiakas.toimiala].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className={`text-sm font-medium mt-1 ${statusColors[asiakas.status] ?? 'text-slate-light'}`}>
              {asiakas.status}
            </p>
            <div className="flex gap-3 mt-2">
              {asiakas.segmentti && (
                <span className="text-xs text-[var(--color-neon-green)] border border-[var(--color-neon-green)]/30 rounded-full px-2 py-0.5">
                  {asiakas.segmentti}
                </span>
              )}
              {asiakas.lahde && (
                <span className="text-xs text-slate-muted border border-white/10 rounded-full px-2 py-0.5">
                  {asiakas.lahde}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={() => setShowSahkoposti(true)}
              className="text-sm px-3 py-1.5 rounded-lg bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/30 hover:bg-[var(--color-neon-cyan)]/20 transition-colors"
            >
              Sähköpostimallit
            </button>
            <button
              onClick={() => setEditAsiakas(true)}
              className="text-sm px-3 py-1.5 rounded-lg bg-[var(--color-neon-magenta)]/20 text-[var(--color-neon-magenta)] border border-[var(--color-neon-magenta)]/40 hover:bg-[var(--color-neon-magenta)]/30 transition-colors"
            >
              Muokkaa
            </button>
            <button
              onClick={handleDeleteAsiakas}
              className="text-sm px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              Poista
            </button>
          </div>
        </div>
      </div>

      {/* Muistutukset */}
      <div className="glass-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-amber-400">
            Muistutukset
            {avoimet.length > 0 && (
              <span className="ml-2 text-xs text-slate-muted font-normal">{avoimet.length} avointa</span>
            )}
          </h2>
          {!muistutusCollectionMissing && (
            <button
              onClick={() => setShowMuistutusForm(!showMuistutusForm)}
              className="text-xs px-2 py-1 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 transition-colors"
            >
              + Lisää muistutus
            </button>
          )}
        </div>

        {muistutusCollectionMissing && (
          <div className="text-xs text-amber-400/80 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
            Luo PocketBaseen kokoelma <strong>muistutukset</strong> kentillä: asiakas (relation), teksti (text), paivamaara (text), tehty (bool).
          </div>
        )}

        {showMuistutusForm && (
          <form onSubmit={handleAddMuistutus} className="mb-3 flex flex-col gap-2 p-3 rounded-lg bg-black/20 border border-white/5">
            <input
              placeholder="Muistutuksen teksti…"
              value={muistutusTeksti}
              onChange={(e) => setMuistutusTeksti(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="date"
              value={muistutusPvm}
              onChange={(e) => setMuistutusPvm(e.target.value)}
              className={inputClass}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingMuistutus}
                className="text-xs px-3 py-1.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 disabled:opacity-50 transition-colors"
              >
                {savingMuistutus ? 'Tallennetaan…' : 'Tallenna'}
              </button>
              <button
                type="button"
                onClick={() => setShowMuistutusForm(false)}
                className="text-xs px-3 py-1.5 rounded text-slate-muted border border-white/10 hover:border-white/20 transition-colors"
              >
                Peruuta
              </button>
            </div>
          </form>
        )}

        {avoimet.length === 0 && !muistutusCollectionMissing && (
          <p className="text-slate-muted text-sm">Ei avoimia muistutuksia.</p>
        )}

        <div className="space-y-2">
          {avoimet.map((m) => {
            const isOverdue = new Date(m.paivamaara) < now;
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 p-2 rounded-lg border group ${
                  isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-black/10'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm text-slate-light">{m.teksti}</p>
                  <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-slate-muted'}`}>
                    {new Date(m.paivamaara).toLocaleDateString('fi-FI')}
                    {isOverdue && ' – myöhässä!'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleMuistutusDone(m.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)] border border-[var(--color-neon-green)]/30 hover:bg-[var(--color-neon-green)]/20 transition-colors"
                  >
                    Tehty
                  </button>
                  <button
                    onClick={() => handleDeleteMuistutus(m.id)}
                    className="text-xs text-red-400/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    Poista
                  </button>
                </div>
              </div>
            );
          })}
          {tehdyt.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-slate-muted cursor-pointer hover:text-slate-light transition-colors">
                {tehdyt.length} tehty muistutus
              </summary>
              <div className="space-y-1 mt-1">
                {tehdyt.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg opacity-50">
                    <p className="text-sm text-slate-muted line-through">{m.teksti}</p>
                    <button
                      onClick={() => handleDeleteMuistutus(m.id)}
                      className="text-xs text-red-400/50 hover:text-red-400 transition-colors ml-2"
                    >
                      Poista
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Projektit */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold neon-text-cyan">Projektit</h2>
          <button
            onClick={() => setShowAddProjekti(true)}
            className="text-xs px-2 py-1 rounded bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/40 hover:bg-[var(--color-neon-cyan)]/30 transition-colors"
          >
            + Lisää projekti
          </button>
        </div>

        {projektit.length === 0 ? (
          <p className="text-slate-muted text-sm">Ei projekteja vielä.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-muted text-xs border-b border-white/5">
                  <th className="text-left pb-2 font-medium">Projekti</th>
                  <th className="text-right pb-2 font-medium">Hinta</th>
                  <th className="text-left pb-2 font-medium pl-3">Deadline</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {projektit.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 group hover:bg-white/[0.02]">
                    <td className="py-2 text-slate-light">{p.name}</td>
                    <td className="py-2 text-right text-[var(--color-neon-green)]">
                      {p.hinta ? `${p.hinta.toLocaleString('fi-FI')} €` : '—'}
                    </td>
                    <td className="py-2 pl-3 text-slate-muted text-xs">
                      {p.deadline ? new Date(p.deadline).toLocaleDateString('fi-FI') : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <span className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditProjekti(p)}
                          className="text-xs text-[var(--color-neon-magenta)] hover:opacity-80"
                        >
                          Muokkaa
                        </button>
                        <button
                          onClick={() => handleDeleteProjekti(p.id)}
                          className="text-xs text-red-400 hover:opacity-80"
                        >
                          Poista
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aktiviteettiloki */}
      <AktiviteettiLog asiakasId={asiakasId} />

      {/* Modaalit */}
      {editAsiakas && (
        <AsiakasForm asiakas={asiakas} onSave={handleSaveAsiakas} onClose={() => setEditAsiakas(false)} />
      )}
      {(showAddProjekti || editProjekti) && (
        <ProjektiForm
          projekti={editProjekti ?? undefined}
          asiakasId={asiakasId}
          asiakkaat={asiakkaat}
          onSave={handleSaveProjekti}
          onClose={() => { setShowAddProjekti(false); setEditProjekti(null); }}
        />
      )}
      {showSahkoposti && (
        <SahkopostiMallit
          asiakasNimi={asiakas.name}
          onClose={() => setShowSahkoposti(false)}
        />
      )}
    </>
  );
}
