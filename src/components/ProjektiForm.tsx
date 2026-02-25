import { useState } from 'react';
import Modal from './Modal';
import { getPocketBase } from '@/lib/pocketbase';
import type { Asiakas, Projekti, ProjektiStatus } from '@/lib/types';

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-neon-cyan)] focus:border-transparent';

const STATUS_OPTIONS: ProjektiStatus[] = ['Uusi', 'Yhteydenotto', 'Tarjous', 'Neuvottelu', 'Voitettu', 'Hävinnyt'];

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
  const [status, setStatus] = useState<ProjektiStatus>(projekti?.status ?? 'Uusi');
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
      status,
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
      console.error(err);
      setError(err instanceof Error ? err.message : 'Tallennus epäonnistui.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={projekti ? 'Muokkaa projektia' : 'Uusi projekti'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="glass-form p-6 rounded-xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-muted">Nimi *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
            placeholder="Projektin nimi"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-muted">Hinta (€)</label>
            <input
              type="number"
              value={hinta}
              onChange={(e) => setHinta(e.target.value)}
              min="0"
              step="0.01"
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-muted">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-muted">Asiakas *</label>
          <select
            value={asiakas}
            onChange={(e) => setAsiakas(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">— Valitse asiakas —</option>
            {asiakkaat.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-muted">Tila</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjektiStatus)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {error && <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">{error}</div>}
        
        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg font-semibold bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/50 hover:bg-[var(--color-neon-cyan)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading ? 'Tallennetaan…' : 'Tallenna'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-medium text-slate-muted border border-white/10 hover:bg-white/5 hover:text-slate-light transition-colors active:scale-[0.98]"
          >
            Peruuta
          </button>
        </div>
      </form>
    </Modal>
  );
}
