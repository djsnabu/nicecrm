import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = saved ?? 'dark';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  }

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Vaihda vaaleaan tilaan' : 'Vaihda tummaan tilaan'}
      className="text-sm px-2.5 py-1 rounded-lg border transition-colors text-slate-muted border-white/10 hover:border-white/20 hover:text-[var(--color-neon-cyan)]"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      {theme === 'dark' ? '☀ Vaalea' : '☾ Tumma'}
    </button>
  );
}
