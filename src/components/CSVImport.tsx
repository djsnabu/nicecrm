import { useRef, useState } from 'react';
import Modal from './Modal';
import { getPocketBase } from '@/lib/pocketbase';
import type { Asiakas, AsiakasStatus } from '@/lib/types';

interface Props {
  onImported: (uudet: Asiakas[]) => void;
  onClose: () => void;
}

type CRMKentta = 'name' | 'email' | 'phone' | 'status' | 'segmentti' | 'lahde' | 'kaupunki' | 'toimiala' | '-';

const CRM_KENTAT: { value: CRMKentta; label: string }[] = [
  { value: '-', label: '— Ohita —' },
  { value: 'name', label: 'Nimi *' },
  { value: 'email', label: 'Sähköposti' },
  { value: 'phone', label: 'Puhelin' },
  { value: 'status', label: 'Tila' },
  { value: 'segmentti', label: 'Segmentti' },
  { value: 'lahde', label: 'Lähde' },
  { value: 'kaupunki', label: 'Kaupunki' },
  { value: 'toimiala', label: 'Toimiala' },
];

const VALID_STATUSES: AsiakasStatus[] = ['Uusi', 'Tarjous', 'Kauppa', 'Hävisi'];

function arvaKentta(otsikko: string): CRMKentta {
  const o = otsikko.toLowerCase().trim();
  if (/^(nimi|name|yritys|company|asiakas|firma)$/.test(o)) return 'name';
  if (/^(s.hk.posti|email|mail|e-mail|sposti)$/.test(o)) return 'email';
  if (/^(puhelin|phone|tel|puh|gsm|numero)$/.test(o)) return 'phone';
  if (/^(tila|status|vaihe|stage)$/.test(o)) return 'status';
  if (/^(segmentti|segment|ryhm.)$/.test(o)) return 'segmentti';
  if (/^(l.hde|lahde|source|kanava)$/.test(o)) return 'lahde';
  if (/^(kaupunki|city|paikkakunta|kunta)$/.test(o)) return 'kaupunki';
  if (/^(toimiala|industry|ala|sector)$/.test(o)) return 'toimiala';
  return '-';
}

function parseCSV(teksti: string): { otsikot: string[]; rivit: string[][] } {
  const linjat = teksti.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (linjat.length === 0) return { otsikot: [], rivit: [] };

  // Autodetect delimiter: semicolon (Finnish Excel) or comma
  const eka = linjat[0];
  const erotin = eka.split(';').length > eka.split(',').length ? ';' : ',';

  function parseLinja(linja: string): string[] {
    const solut: string[] = [];
    let kentta = '';
    let lainaus = false;
    for (let i = 0; i < linja.length; i++) {
      const c = linja[i];
      if (c === '"') {
        if (lainaus && linja[i + 1] === '"') { kentta += '"'; i++; }
        else lainaus = !lainaus;
      } else if (c === erotin && !lainaus) {
        solut.push(kentta.trim());
        kentta = '';
      } else {
        kentta += c;
      }
    }
    solut.push(kentta.trim());
    return solut;
  }

  const otsikot = parseLinja(linjat[0]);
  const rivit = linjat.slice(1).map(parseLinja);
  return { otsikot, rivit };
}

export default function CSVImport({ onImported, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [otsikot, setOtsikot] = useState<string[]>([]);
  const [rivit, setRivit] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CRMKentta[]>([]);
  const [importing, setImporting] = useState(false);
  const [tulos, setTulos] = useState<{ ok: number; virhe: number } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const teksti = ev.target?.result as string;
      const { otsikot: o, rivit: r } = parseCSV(teksti);
      setOtsikot(o);
      setRivit(r);
      setMapping(o.map(arvaKentta));
      setTulos(null);
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    const nameIdx = mapping.indexOf('name');
    if (nameIdx === -1) {
      alert('Valitse ainakin Nimi-sarake.');
      return;
    }
    setImporting(true);
    const pb = getPocketBase();
    let ok = 0;
    let virhe = 0;
    const uudet: Asiakas[] = [];

    for (const rivi of rivit) {
      const data: Record<string, string> = { status: 'Uusi' };
      mapping.forEach((kentta, i) => {
        if (kentta === '-' || !rivi[i]) return;
        const arvo = rivi[i].trim();
        if (!arvo) return;
        if (kentta === 'status') {
          // Normalize status
          const match = VALID_STATUSES.find(
            (s) => s.toLowerCase() === arvo.toLowerCase()
          );
          data.status = match ?? 'Uusi';
        } else {
          data[kentta] = arvo;
        }
      });
      if (!data.name) { virhe++; continue; }
      try {
        const saved = await pb.collection('asiakkaat').create<Asiakas>(data);
        uudet.push(saved);
        ok++;
      } catch {
        virhe++;
      }
    }

    setTulos({ ok, virhe });
    setImporting(false);
    if (uudet.length > 0) onImported(uudet);
  }

  const inputClass =
    'px-2 py-1 rounded bg-black/30 border border-white/10 text-slate-light text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-cyan)]';

  return (
    <Modal title="Tuo liidit CSV:stä" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* File input */}
        <div>
          <label className="block text-sm text-slate-muted mb-2">
            Valitse CSV-tiedosto (pilkku- tai puolipisteeroteltu, UTF-8)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="text-sm text-slate-light file:mr-3 file:px-3 file:py-1.5 file:rounded file:bg-[var(--color-neon-cyan)]/20 file:text-[var(--color-neon-cyan)] file:border file:border-[var(--color-neon-cyan)]/40 file:text-xs file:cursor-pointer hover:file:bg-[var(--color-neon-cyan)]/30 transition-colors"
          />
        </div>

        {/* Column mapping */}
        {otsikot.length > 0 && (
          <div>
            <p className="text-sm text-slate-muted mb-2">
              Yhdistä sarakkeet CRM-kenttiin ({rivit.length} riviä löydetty)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-muted border-b border-white/5">
                    <th className="text-left pb-2 font-medium">CSV-sarake</th>
                    <th className="text-left pb-2 font-medium pl-2">Esimerkki</th>
                    <th className="text-left pb-2 font-medium pl-2">CRM-kenttä</th>
                  </tr>
                </thead>
                <tbody>
                  {otsikot.map((o, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-1.5 text-slate-light font-medium">{o}</td>
                      <td className="py-1.5 pl-2 text-slate-muted truncate max-w-[120px]">
                        {rivit[0]?.[i] ?? '—'}
                      </td>
                      <td className="py-1.5 pl-2">
                        <select
                          value={mapping[i]}
                          onChange={(e) =>
                            setMapping((prev) =>
                              prev.map((v, j) => (j === i ? (e.target.value as CRMKentta) : v))
                            )
                          }
                          className={inputClass}
                        >
                          {CRM_KENTAT.map((k) => (
                            <option key={k.value} value={k.value}>{k.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Preview */}
            {rivit.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-slate-muted cursor-pointer hover:text-slate-light transition-colors">
                  Esikatsele ensimmäiset {Math.min(5, rivit.length)} riviä
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-muted border-b border-white/5">
                        {otsikot.map((o, i) => (
                          <th key={i} className="text-left pb-1 pr-3 font-medium">{o}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rivit.slice(0, 5).map((r, ri) => (
                        <tr key={ri} className="border-b border-white/5">
                          {r.map((solu, si) => (
                            <td key={si} className="py-1 pr-3 text-slate-light truncate max-w-[100px]">
                              {solu || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {/* Result */}
            {tulos && (
              <div className={`mt-3 p-3 rounded-lg border text-sm ${
                tulos.virhe === 0
                  ? 'bg-[var(--color-neon-green)]/10 border-[var(--color-neon-green)]/30 text-[var(--color-neon-green)]'
                  : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
              }`}>
                {tulos.ok} liidiä tuotu onnistuneesti
                {tulos.virhe > 0 && ` — ${tulos.virhe} riviä epäonnistui (tyhjä nimi?)`}
              </div>
            )}

            {/* Import button */}
            {!tulos && (
              <button
                onClick={handleImport}
                disabled={importing || mapping.indexOf('name') === -1}
                className="mt-3 w-full py-2 rounded-lg font-medium bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/50 hover:bg-[var(--color-neon-cyan)]/30 disabled:opacity-50 transition-colors text-sm"
              >
                {importing
                  ? `Tuodaan… (${rivit.length} riviä)`
                  : `Tuo ${rivit.length} liidiä`}
              </button>
            )}

            {tulos && (
              <button
                onClick={onClose}
                className="mt-2 w-full py-2 rounded-lg text-slate-muted border border-white/10 hover:border-white/20 transition-colors text-sm"
              >
                Sulje
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
