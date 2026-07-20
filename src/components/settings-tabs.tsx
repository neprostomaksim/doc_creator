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
    <div className="mb-6 flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            pathname.startsWith(tab.href)
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
