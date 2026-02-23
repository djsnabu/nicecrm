import { useState } from 'react';
import Modal from './Modal';
import { getPocketBase } from '@/lib/pocketbase';
import type { Asiakas, Projekti } from '@/lib/types';

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-neon-cyan)] focus:border-transparent';

interface Props {
  projekti?: Projekti;
  asiakasId?: string;
  asiakkaat: Asiakas[];
  onSave: (p: Projekti) => void;
  onClose: () => void;
}

export default function ProjektiForm({ projekti, asiakasId, asiakkaat, onSave, onClose }: Props) {
  const [name, setName] = useState(projekti?.name ?? '');
  const [hinta, setHinta] = useState(projekti?.hinta?.toString() ?? '');
  const [deadline, setDeadline] = useState(projekti?.deadline?.slice(0, 10) ?? '');
  const [asiakas, setAsiakas] = useState(projekti?.asiakas ?? asiakasId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const pb = getPocketBase();
    const data = {
      name,
      hinta: hinta ? parseFloat(hinta) : 0,
      deadline,
      asiakas,
    };
    try {
      let saved: Projekti;
      if (projekti?.id) {
        saved = await pb.collection('projektit').update<Projekti>(projekti.id, data);
      } else {
        saved = await pb.collection('projektit').create<Projekti>(data);
      }
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tallennus epäonnistui.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={projekti ? 'Muokkaa projektia' : 'Uusi projekti'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-muted">Nimi *</label>
          <input
            type="text"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-muted">Hinta (€)</label>
          <input
            type="number"
            value={hinta}
            onInput={(e) => setHinta((e.target as HTMLInputElement).value)}
            min="0"
            step="0.01"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-muted">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-muted">Asiakas *</label>
          <select
            value={asiakas}
            onChange={(e) => setAsiakas(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">— valitse —</option>
            {asiakkaat.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 rounded-lg font-medium bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/50 hover:bg-[var(--color-neon-cyan)]/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Tallennetaan…' : 'Tallenna'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-muted border border-white/10 hover:border-white/20 transition-colors"
          >
            Peruuta
          </button>
        </div>
      </form>
    </Modal>
  );
}
