'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';
import { NavIcon } from './icons';

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

export function BottomNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-stretch justify-between pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
            isActive(pathname, item.href) ? 'text-accent' : 'text-muted'
          }`}
        >
          <NavIcon name={item.icon} width={20} height={20} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
