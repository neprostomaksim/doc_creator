'use client';

import { useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('theme') as Theme | null) ?? 'system';
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(readInitial);

  function cycle() {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
    localStorage.setItem('theme', next);
    apply(next);
  }

  const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌗';
  const label = theme === 'dark' ? 'Тёмная' : theme === 'light' ? 'Светлая' : 'Как в системе';

  return (
    <button
      type="button"
      onClick={cycle}
      suppressHydrationWarning
      className={`btn btn-ghost gap-2 text-sm ${compact ? 'w-auto justify-center px-2' : 'w-full justify-start'}`}
      title="Переключить тему"
    >
      <span aria-hidden suppressHydrationWarning>
        {icon}
      </span>
      {!compact && <span suppressHydrationWarning>{label}</span>}
    </button>
  );
}
