import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InvitesManager, type InviteRow } from '@/components/invites-manager';

export default async function InvitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect('/dashboard/settings/requisites');

  const { data: codes } = await supabase
    .from('invite_codes')
    .select('code, is_used, created_at')
    .order('created_at', { ascending: false });

  return <InvitesManager initialCodes={(codes ?? []) as InviteRow[]} />;
}
