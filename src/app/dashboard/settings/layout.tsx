import { createClient } from '@/lib/supabase/server';
import { SettingsTabs } from '@/components/settings-tabs';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    : { data: null };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-fg">Настройки</h1>
      <SettingsTabs isAdmin={profile?.is_admin ?? false} />
      {children}
    </div>
  );
}
