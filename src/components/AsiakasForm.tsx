import { useState } from 'react';
import Modal from './Modal';
import { getPocketBase } from '@/lib/pocketbase';
import type { Asiakas, AsiakasLahde, AsiakasSegmentti, AsiakasStatus } from '@/lib/types';

const STATUSES: AsiakasStatus[] = ['Uusi', 'Tarjous', 'Kauppa', 'Hävisi'];
const SEGMENTIT: AsiakasSegmentti[] = ['A-ryhmä', 'B-ryhmä', 'C-ryhmä', 'Passiivinen', 'Potentiaalinen'];
const LAHTEET: AsiakasLahde[] = ['Kylmäsoitto', 'Suositus', 'Verkkosivut', 'Messut', 'YTJ', 'Muu', 'Tuntematon'];

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-neon-cyan)] focus:border-transparent';

interface Props {
  asiakas?: Asiakas;
  onSave: (a: Asiakas) => void;
  onClose: () => void;
}

export default function AsiakasForm({ asiakas, onSave, onClose }: Props) {
  const [name, setName] = useState(asiakas?.name ?? '');
  const [email, setEmail] = useState(asiakas?.email ?? '');
  const [phone, setPhone] = useState(asiakas?.phone ?? '');
  const [status, setStatus] = useState<AsiakasStatus>(asiakas?.status ?? 'Uusi');
  const [segmentti, setSegmentti] = useState<string>(asiakas?.segmentti ?? '');
  const [lahde, setLahde] = useState<string>(asiakas?.lahde ?? '');
  const [kaupunki, setKaupunki] = useState(asiakas?.kaupunki ?? '');
  const [toimiala, setToimiala] = useState(asiakas?.toimiala ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const pb = getPocketBase();
    const data: Record<string, string> = { name, email, phone, status };
    if (segmentti) data.segmentti = segmentti;
    if (lahde) data.lahde = lahde;
    if (kaupunki) data.kaupunki = kaupunki;
    if (toimiala) data.toimiala = toimiala;
    try {
      let saved: Asiakas;
      if (asiakas?.id) {
        saved = await pb.collection('asiakkaat').update<Asiakas>(asiakas.id, data);
      } else {
        saved = await pb.collection('asiakkaat').create<Asiakas>(data);
      }
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tallennus epäonnistui.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={asiakas ? 'Muokkaa asiakasta' : 'Uusi asiakas'} onClose={onClose}>
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
          <label className="text-sm text-slate-muted">Sähköposti</label>
          <input
            type="email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-muted">Puhelin</label>
          <input
            type="tel"
            value={phone}
            onInput={(e) => setPhone((e.target as HTMLInputElement).value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-muted">Tila</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AsiakasStatus)}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-muted">Kaupunki</label>
            <input
              type="text"
              value={kaupunki}
              onInput={(e) => setKaupunki((e.target as HTMLInputElement).value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-muted">Toimiala</label>
            <input
              type="text"
              value={toimiala}
              onInput={(e) => setToimiala((e.target as HTMLInputElement).value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-muted">Segmentti</label>
            <select
              value={segmentti}
              onChange={(e) => setSegmentti(e.target.value)}
              className={inputClass}
            >
              <option value="">— Ei valittu —</option>
              {SEGMENTIT.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-muted">Lähde</label>
            <select
              value={lahde}
              onChange={(e) => setLahde(e.target.value)}
              className={inputClass}
            >
              <option value="">— Ei valittu —</option>
              {LAHTEET.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
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
