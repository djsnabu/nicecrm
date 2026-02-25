import { useEffect, useState } from 'react';
import { getPocketBase } from '@/lib/pocketbase';
import type { Aktiviteetti, AktiviteettiTyyppi } from '@/lib/types';

const TYYPIT: AktiviteettiTyyppi[] = ['Puhelu', 'Sähköposti', 'Muistiinpano', 'Tapaaminen'];

const tyyppiVari: Record<AktiviteettiTyyppi, string> = {
  Puhelu: 'text-[var(--color-neon-cyan)]',
  Sähköposti: 'text-[var(--color-neon-magenta)]',
  Muistiinpano: 'text-slate-light',
  Tapaaminen: 'text-[var(--color-neon-green)]',
};

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)] focus:border-transparent text-sm';

interface Props {
  asiakasId: string;
}

export default function AktiviteettiLog({ asiakasId }: Props) {
  const [aktiviteetit, setAktiviteetit] = useState<Aktiviteetti[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionMissing, setCollectionMissing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [tyyppi, setTyyppi] = useState<AktiviteettiTyyppi>('Muistiinpano');
  const [kuvaus, setKuvaus] = useState('');
  const [paivamaara, setPaivamaara] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPocketBase()
      .collection('aktiviteetit')
      .getFullList<Aktiviteetti>({
        filter: `asiakas="${asiakasId}"`,
        sort: '-paivamaara,-created',
        requestKey: null,
      })
      .then(setAktiviteetit)
      .catch((err) => {
        if (err?.status === 404) setCollectionMissing(true);
      })
      .finally(() => setLoading(false));
  }, [asiakasId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await getPocketBase()
        .collection('aktiviteetit')
        .create<Aktiviteetti>({ asiakas: asiakasId, tyyppi, kuvaus, paivamaara });
      setAktiviteetit((prev) => [saved, ...prev]);
      setKuvaus('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await getPocketBase().collection('aktiviteetit').delete(id);
      setAktiviteetit((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="glass-card mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold neon-text-magenta">Aktiviteettiloki</h2>
        {!collectionMissing && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs px-2 py-1 rounded bg-[var(--color-neon-magenta)]/20 text-[var(--color-neon-magenta)] border border-[var(--color-neon-magenta)]/40 hover:bg-[var(--color-neon-magenta)]/30 transition-colors"
          >
            + Lisää
          </button>
        )}
      </div>

      {collectionMissing && (
        <div className="text-xs text-amber-400 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
          Luo PocketBaseen kokoelma <strong>aktiviteetit</strong> kentillä: asiakas (relation), tyyppi (text), kuvaus (text), paivamaara (text).
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="flex gap-2">
            <select
              value={tyyppi}
              onChange={(e) => setTyyppi(e.target.value as AktiviteettiTyyppi)}
              className={inputClass}
            >
              {TYYPIT.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="date"
              value={paivamaara}
              onChange={(e) => setPaivamaara(e.target.value)}
              className={inputClass}
            />
          </div>
          <textarea
            value={kuvaus}
            onChange={(e) => setKuvaus(e.target.value)}
            placeholder="Kuvaus…"
            rows={2}
            required
            className={`${inputClass} resize-none`}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-neon-magenta)]/20 text-[var(--color-neon-magenta)] border border-[var(--color-neon-magenta)]/40 hover:bg-[var(--color-neon-magenta)]/30 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Tallennetaan…' : 'Tallenna'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 rounded-lg text-slate-muted border border-white/10 hover:border-white/20 transition-colors"
            >
              Peruuta
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-slate-muted text-sm">Ladataan…</p>}

      {!loading && !collectionMissing && aktiviteetit.length === 0 && (
        <p className="text-slate-muted text-sm">Ei aktiviteetteja vielä.</p>
      )}

      <div className="space-y-2">
        {aktiviteetit.map((a) => (
          <div
            key={a.id}
            className="flex gap-3 p-2 rounded-lg bg-black/10 border border-white/5 group hover:border-white/10 transition-colors"
          >
            <div className="shrink-0 w-24">
              <span className={`text-xs font-medium ${tyyppiVari[a.tyyppi] ?? 'text-slate-muted'}`}>
                {a.tyyppi}
              </span>
              <p className="text-xs text-slate-muted">
                {new Date(a.paivamaara).toLocaleDateString('fi-FI')}
              </p>
            </div>
            <p className="text-sm text-slate-light flex-1 whitespace-pre-wrap">{a.kuvaus}</p>
            <button
              onClick={() => handleDelete(a.id)}
              className="text-xs text-red-400/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            >
              Poista
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
