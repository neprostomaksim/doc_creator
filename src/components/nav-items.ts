import type { IconName } from './icons';

export const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Дашборд', icon: 'dashboard' },
  { href: '/dashboard/contracts', label: 'Договоры', icon: 'contracts' },
  { href: '/dashboard/clients', label: 'Клиенты', icon: 'clients' },
  { href: '/dashboard/templates', label: 'Шаблоны', icon: 'templates' },
  { href: '/dashboard/materials', label: 'Материалы', icon: 'materials' },
  { href: '/dashboard/settings', label: 'Настройки', icon: 'settings' },
];
