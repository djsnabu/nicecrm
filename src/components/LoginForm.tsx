import { useState, useEffect } from 'react';
import { ClientResponseError } from 'pocketbase';
import { getPocketBase } from '@/lib/pocketbase';

const STATUSES = { idle: 'idle', loading: 'loading', error: 'error', success: 'success' } as const;

function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ClientResponseError) {
    const msg = err.response?.message ?? err.message;
    if (err.status === 0) return 'Yhteys epäonnistui (CORS/väärä osoite/SSL). Käytä http:// eikä https:// .env:ssä jos PocketBase ei käy TLS:ää.';
    if (err.status === 404) return 'Kirjautumispolku ei löydy (404). Tarkista että PocketBase on käynnissä ja PUBLIC_POCKETBASE_URL on oikein.';
    if (err.status === 400 || err.status === 401) return msg || 'Väärä sähköposti tai salasana.';
    return msg || `Virhe ${err.status}`;
  }
  if (err && typeof err === 'object' && 'message' in err) return String((err as Error).message);
  return 'Kirjautuminen epäonnistui.';
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<keyof typeof STATUSES>('idle');
  const [message, setMessage] = useState('');
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  useEffect(() => {
    const pb = getPocketBase();
    const url = `${pb.baseUrl}/api/health`;
    fetch(url, { method: 'GET', mode: 'cors' })
      .then((r) => r.ok)
      .then(setConnectionOk)
      .catch(() => setConnectionOk(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    const pb = getPocketBase();
    const authMode = (import.meta.env.PUBLIC_POCKETBASE_AUTH ?? 'admin').toLowerCase();
    try {
      if (authMode === 'users') {
        await pb.collection('users').authWithPassword(email, password);
      } else {
        await pb.collection('_superusers').authWithPassword(email, password);
      }
      setStatus('success');
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setStatus('error');
      setMessage(getAuthErrorMessage(err));
      if (err instanceof ClientResponseError) {
        console.error('[NiceCRM] Kirjautumisvirhe:', {
          status: err.status,
          url: err.url,
          message: err.message,
          response: err.response,
          baseUrl: pb.baseUrl,
        });
      } else {
        console.error('[NiceCRM] Kirjautumisvirhe:', err);
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card w-full max-w-sm mx-auto flex flex-col gap-4 border border-white/10 neon-border-cyan"
    >
      <h2 className="text-xl font-semibold neon-text-cyan">Kirjaudu</h2>
      <p className="text-xs text-slate-muted break-all">API: {getPocketBase().baseUrl}</p>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm text-slate-muted">Sähköposti</label>
        <input
          id="email"
          type="email"
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-neon-cyan)] focus:border-transparent"
          placeholder="sinä@yritys.fi"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-slate-muted">Salasana</label>
        <input
          id="password"
          type="password"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-light placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-neon-cyan)] focus:border-transparent"
        />
      </div>
      {connectionOk === false && (
        <p className="text-sm text-amber-400">
          PocketBase ei vastaa ({getPocketBase().baseUrl}). Tarkista .env ja että palvelin on käynnissä.
        </p>
      )}
      {connectionOk === true && (
        <p className="text-xs text-slate-muted">
          Yhteys PocketBaseen OK. Jos kirjautuminen antaa 404, välityspalvelimella ohjaa <code className="bg-black/30 px-1 rounded">/api/admins/*</code> PocketBaseen.
        </p>
      )}
      {message && (
        <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-neon-green'}`}>
          {message}
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-slate-muted">F12 → Console näyttää tarkemmat tiedot</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-2.5 rounded-lg font-medium bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/50 hover:bg-[var(--color-neon-cyan)]/30 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? 'Kirjaudutaan…' : 'Kirjaudu'}
      </button>
    </form>
  );
}
