'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BASE_TABS = [
  { href: '/dashboard/settings/requisites', label: 'Реквизиты' },
  { href: '/dashboard/settings/stamps', label: 'Подписи и печати' },
  { href: '/dashboard/settings/api-keys', label: 'Ключи ИИ' },
  { href: '/dashboard/settings/profile', label: 'Профиль' },
];

export function SettingsTabs({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin
    ? [...BASE_TABS, { href: '/dashboard/settings/invites', label: 'Приглашения' }]
    : BASE_TABS;

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
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
