import { useEffect, useState } from 'react';
import { getPocketBase } from '@/lib/pocketbase';
import type { SahkopostiMalli } from '@/lib/types';
import Modal from './Modal';

interface Props {
  asiakasNimi?: string;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)] focus:border-transparent text-sm';

export default function SahkopostiMallit({ asiakasNimi, onClose }: Props) {
  const [mallit, setMallit] = useState<SahkopostiMalli[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionMissing, setCollectionMissing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [nimi, setNimi] = useState('');
  const [aihe, setAihe] = useState('');
  const [sisalto, setSisalto] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPocketBase()
      .collection('sahkopostimallit')
      .getFullList<SahkopostiMalli>({ requestKey: null })
      .then(setMallit)
      .catch((err) => {
        if (err?.status === 404) setCollectionMissing(true);
      })
      .finally(() => setLoading(false));
  }, []);

  function kopioi(malli: SahkopostiMalli) {
    const teksti = asiakasNimi
      ? malli.sisalto.replace(/\[ASIAKAS\]/g, asiakasNimi)
      : malli.sisalto;
    navigator.clipboard.writeText(teksti);
    setCopied(malli.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await getPocketBase()
        .collection('sahkopostimallit')
        .create<SahkopostiMalli>({ nimi, aihe, sisalto });
      setMallit((prev) => [...prev, saved]);
      setNimi('');
      setAihe('');
      setSisalto('');
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Poistetaanko malli?')) return;
    try {
      await getPocketBase().collection('sahkopostimallit').delete(id);
      setMallit((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Modal title="Sähköpostimallit" onClose={onClose}>
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
        {collectionMissing && (
          <div className="text-xs text-amber-400 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
            Luo PocketBaseen kokoelma <strong>sahkopostimallit</strong> kentillä: nimi (text), aihe (text), sisalto (text).
          </div>
        )}

        {loading && <p className="text-slate-muted text-sm">Ladataan…</p>}

        {!loading && !collectionMissing && mallit.length === 0 && !showAdd && (
          <p className="text-slate-muted text-sm">Ei malleja vielä. Luo ensimmäinen alla.</p>
        )}

        {asiakasNimi && mallit.length > 0 && (
          <p className="text-xs text-slate-muted">
            Käytä <code className="text-[var(--color-neon-cyan)]">[ASIAKAS]</code> tekstissä — korvautuu automaattisesti nimellä "{asiakasNimi}".
          </p>
        )}

        {mallit.map((m) => (
          <div key={m.id} className="p-3 rounded-lg border border-white/10 bg-black/20">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-medium text-slate-light">{m.nimi}</p>
                {m.aihe && (
                  <p className="text-xs text-slate-muted">Aihe: {m.aihe}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => kopioi(m)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    copied === m.id
                      ? 'bg-[var(--color-neon-green)]/20 text-[var(--color-neon-green)] border-[var(--color-neon-green)]/40'
                      : 'bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]/30 hover:bg-[var(--color-neon-cyan)]/20'
                  }`}
                >
                  {copied === m.id ? 'Kopioitu!' : 'Kopioi'}
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-xs text-red-400/50 hover:text-red-400 transition-colors"
                >
                  Poista
                </button>
              </div>
            </div>
            <pre className="text-xs text-slate-muted whitespace-pre-wrap border-t border-white/5 pt-2 font-sans">
              {asiakasNimi ? m.sisalto.replace(/\[ASIAKAS\]/g, asiakasNimi) : m.sisalto}
            </pre>
          </div>
        ))}

        {showAdd ? (
          <form onSubmit={handleAdd} className="flex flex-col gap-2 p-3 rounded-lg border border-white/10 bg-black/20">
            <input
              placeholder="Mallin nimi *"
              value={nimi}
              onChange={(e) => setNimi(e.target.value)}
              required
              className={inputClass}
            />
            <input
              placeholder="Sähköpostin aihe"
              value={aihe}
              onChange={(e) => setAihe(e.target.value)}
              className={inputClass}
            />
            <textarea
              placeholder={"Sisältö… Käytä [ASIAKAS] asiakkaan nimen kohdalla."}
              value={sisalto}
              onChange={(e) => setSisalto(e.target.value)}
              rows={5}
              required
              className={`${inputClass} resize-none`}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/40 hover:bg-[var(--color-neon-cyan)]/30 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Tallennetaan…' : 'Tallenna'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-xs px-3 py-1.5 rounded text-slate-muted border border-white/10 hover:border-white/20 transition-colors"
              >
                Peruuta
              </button>
            </div>
          </form>
        ) : (
          !collectionMissing && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-[var(--color-neon-cyan)] hover:opacity-80 transition-opacity text-left"
            >
              + Lisää uusi malli
            </button>
          )
        )}
      </div>
    </Modal>
  );
}
