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

export function ThemeToggle() {
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
      className="btn btn-ghost w-full justify-start gap-2 text-sm"
      title="Переключить тему"
    >
      <span aria-hidden suppressHydrationWarning>
        {icon}
      </span>
      <span suppressHydrationWarning>{label}</span>
    </button>
  );
}
