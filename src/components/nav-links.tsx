'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

export function SidebarNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            isActive(pathname, item.href)
              ? 'bg-accent text-accent-fg shadow-sm'
              : 'text-muted hover:bg-surface2 hover:text-fg'
          }`}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-stretch justify-between pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            isActive(pathname, item.href) ? 'text-accent' : 'text-muted'
          }`}
        >
          <span aria-hidden className="text-lg leading-none">
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
