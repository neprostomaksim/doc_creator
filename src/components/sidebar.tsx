'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';
import { NavIcon } from './icons';
import { ThemeToggle } from './theme-toggle';
import { LogoutButton } from './logout-button';

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('sidebarCollapsed') === '1';
}

export function Sidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
  }

  return (
    <aside
      suppressHydrationWarning
      className={`glass sticky top-0 hidden h-screen shrink-0 flex-col border-r p-3 transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
        {!collapsed && <span className="text-lg font-semibold text-fg">Договоры</span>}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-fg transition-colors hover:bg-surface2"
        >
          <svg
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
          </svg>
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive(pathname, item.href)
                ? 'bg-accent text-accent-fg shadow-sm'
                : 'text-muted hover:bg-surface2 hover:text-fg'
            }`}
          >
            <NavIcon name={item.icon} />
            {!collapsed && item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-1 pt-4">
        <ThemeToggle compact={collapsed} />
        <div className={`flex items-center px-1 pt-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && <span className="truncate text-sm text-muted">{displayName}</span>}
          <LogoutButton compact={collapsed} />
        </div>
      </div>
    </aside>
  );
}
