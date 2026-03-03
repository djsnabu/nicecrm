import { useState } from 'react';
import Modal from './Modal';
import { getPocketBase } from '@/lib/pocketbase';
import { fetchPRHCompanies, type PRHLead } from '@/lib/prh-api';
import type { Asiakas } from '@/lib/types';

interface Props {
  onImported: (uudet: Asiakas[]) => void;
  onClose: () => void;
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const BATCH_SIZE = 5;

export default function PRHImport({ onImported, onClose }: Props) {
  const [startDate, setStartDate] = useState(daysAgoISO(7));
  const [endDate, setEndDate] = useState(todayISO());
  const [kaupunkiFilter, setKaupunkiFilter] = useState('');
  const [leads, setLeads] = useState<PRHLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'search' | 'preview' | 'done'>('search');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: number; skip: number; fail: number } | null>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      let results = await fetchPRHCompanies(startDate, endDate);
      if (kaupunkiFilter.trim()) {
        const filter = kaupunkiFilter.trim().toLowerCase();
        results = results.filter((r) => r.kaupunki.toLowerCase().includes(filter));
      }
      setLeads(results);
      setSelected(new Set(results.map((r) => r.ytunnus)));
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Haku epäonnistui');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(ytunnus: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ytunnus)) next.delete(ytunnus);
      else next.add(ytunnus);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((r) => r.ytunnus)));
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    const pb = getPocketBase();
    const toImport = leads.filter((l) => selected.has(l.ytunnus));

    // Hae olemassaolevat Y-tunnukset duplikaattien estoon
    let existingYtunnukset = new Set<string>();
    try {
      const existing = await pb.collection('asiakkaat').getFullList<Asiakas>({
        fields: 'ytunnus',
        requestKey: null,
      });
      existingYtunnukset = new Set(existing.map((a) => a.ytunnus).filter(Boolean));
    } catch {
      // Jos haku epäonnistuu, jatketaan ilman duplikaattitarkistusta
    }

    const uudet: Asiakas[] = [];
    let skip = 0;
    let fail = 0;

    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (lead) => {
        if (existingYtunnukset.has(lead.ytunnus)) {
          skip++;
          return;
        }
        try {
          const saved = await pb.collection('asiakkaat').create<Asiakas>({
            name: lead.name,
            ytunnus: lead.ytunnus,
            kaupunki: lead.kaupunki,
            status: 'Uusi',
            lahde: 'YTJ',
            segmentti: 'Potentiaalinen',
          });
          uudet.push(saved);
          existingYtunnukset.add(lead.ytunnus);
        } catch {
          fail++;
        }
      });
      await Promise.all(promises);
    }

    setResult({ ok: uudet.length, skip, fail });
    setStep('done');
    setImporting(false);
    if (uudet.length > 0) onImported(uudet);
  }

  const inputClass =
    'px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)]';

  return (
    <Modal title="Tuo liidit PRH:sta" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Vaihe 1: Hakuparametrit */}
        {step === 'search' && (
          <>
            <p className="text-sm text-slate-muted">
              Hae uudet yritykset suoraan PRH:n avoimesta rajapinnasta. Ei vaadi API-avainta.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-muted">Alkaen</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-muted">Asti</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-muted">Suodata paikkakunta (valinnainen)</label>
              <input
                type="text"
                value={kaupunkiFilter}
                onChange={(e) => setKaupunkiFilter(e.target.value)}
                placeholder="esim. Helsinki"
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setStartDate(daysAgoISO(7)); setEndDate(todayISO()); }}
                className="text-xs px-2 py-1 rounded border border-white/10 text-slate-muted hover:text-slate-light hover:border-white/20 transition-colors"
              >
                7 pv
              </button>
              <button
                onClick={() => { setStartDate(daysAgoISO(14)); setEndDate(todayISO()); }}
                className="text-xs px-2 py-1 rounded border border-white/10 text-slate-muted hover:text-slate-light hover:border-white/20 transition-colors"
              >
                14 pv
              </button>
              <button
                onClick={() => { setStartDate(daysAgoISO(30)); setEndDate(todayISO()); }}
                className="text-xs px-2 py-1 rounded border border-white/10 text-slate-muted hover:text-slate-light hover:border-white/20 transition-colors"
              >
                30 pv
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-2 rounded-lg font-medium bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/50 hover:bg-[var(--color-neon-cyan)]/30 disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? 'Haetaan PRH:sta...' : 'Hae yritykset'}
            </button>
          </>
        )}

        {/* Vaihe 2: Esikatselu ja valinta */}
        {step === 'preview' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-muted">
                {leads.length} yritystä löydetty — {selected.size} valittu
              </p>
              <button
                onClick={() => setStep('search')}
                className="text-xs text-slate-muted hover:text-slate-light transition-colors"
              >
                ← Muokkaa hakua
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-slate-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === leads.length}
                  onChange={toggleAll}
                  className="rounded"
                />
                Valitse kaikki
              </label>
            </div>

            <div className="max-h-[40vh] overflow-y-auto space-y-1 pr-1">
              {leads.map((lead) => (
                <label
                  key={lead.ytunnus}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(lead.ytunnus)
                      ? 'border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/5'
                      : 'border-white/5 bg-black/10 opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(lead.ytunnus)}
                    onChange={() => toggleSelect(lead.ytunnus)}
                    className="rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-light truncate">{lead.name}</p>
                    <p className="text-xs text-slate-muted">
                      {lead.ytunnus} · {lead.yhtiömuoto} · {lead.kaupunki}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="w-full py-2 rounded-lg font-medium bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/50 hover:bg-[var(--color-neon-cyan)]/30 disabled:opacity-50 transition-colors text-sm"
            >
              {importing
                ? `Tuodaan... (${selected.size} yritystä)`
                : `Tuo ${selected.size} yritystä CRM:ään`}
            </button>
          </>
        )}

        {/* Vaihe 3: Tulos */}
        {step === 'done' && result && (
          <>
            <div className={`p-4 rounded-lg border text-sm ${
              result.fail === 0
                ? 'bg-[var(--color-neon-green)]/10 border-[var(--color-neon-green)]/30 text-[var(--color-neon-green)]'
                : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
            }`}>
              <p className="font-medium mb-1">
                {result.ok} yritystä tuotu onnistuneesti
              </p>
              {result.skip > 0 && (
                <p className="text-xs opacity-80">{result.skip} ohitettu (duplikaatti Y-tunnuksella)</p>
              )}
              {result.fail > 0 && (
                <p className="text-xs opacity-80">{result.fail} epäonnistui</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg text-slate-muted border border-white/10 hover:border-white/20 transition-colors text-sm"
            >
              Sulje
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
