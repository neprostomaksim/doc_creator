import { createClient } from '@/lib/supabase/server';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, email, created_at').eq('id', user.id).single()
    : { data: null };

  return (
    <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-4">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Имя</dt>
          <dd className="text-gray-900">{profile?.full_name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Почта</dt>
          <dd className="text-gray-900">{profile?.email}</dd>
        </div>
        <div>
          <dt className="text-gray-500">В сервисе с</dt>
          <dd className="text-gray-900">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ru-RU') : ''}
          </dd>
        </div>
      </dl>
    </div>
  );
}
