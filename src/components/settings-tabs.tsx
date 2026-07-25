'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/settings/requisites', label: 'Реквизиты' },
  { href: '/dashboard/settings/stamps', label: 'Подписи и печати' },
  { href: '/dashboard/settings/profile', label: 'Профиль' },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            pathname.startsWith(tab.href)
              ? 'border-accent text-fg'
              : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
