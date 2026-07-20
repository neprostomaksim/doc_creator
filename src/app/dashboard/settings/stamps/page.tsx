import { createClient } from '@/lib/supabase/server';
import { StampsManager, type StampWithUrl } from '@/components/stamps-manager';

export default async function StampsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: stamps } = await supabase
    .from('stamps')
    .select('id, name, type, file_path')
    .order('created_at', { ascending: false });

  const withUrls: StampWithUrl[] = await Promise.all(
    (stamps ?? []).map(async (stamp) => {
      const { data } = await supabase.storage.from('stamps').createSignedUrl(stamp.file_path, 3600);
      return {
        id: stamp.id,
        name: stamp.name,
        type: stamp.type,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return <StampsManager userId={user.id} stamps={withUrls} />;
}
