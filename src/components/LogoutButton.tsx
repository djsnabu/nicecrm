import { clearAuth } from '@/lib/pocketbase';

export default function LogoutButton() {
  function handleClick() {
    clearAuth();
    window.location.href = '/login';
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-slate-muted hover:text-[var(--color-neon-cyan)] transition-colors"
    >
      Kirjaudu ulos
    </button>
  );
}
