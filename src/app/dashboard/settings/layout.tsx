import { SettingsTabs } from '@/components/settings-tabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-fg">Настройки</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
