import { createClient } from '@/lib/supabase/server';
import { OrganizationCard } from '@/components/organization-card';

export default async function RequisitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: organization } = await supabase
    .from('organizations')
    .select('id, owner_id, name, country, logo_path')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!organization) {
    const { data: created, error: insertError } = await supabase
      .from('organizations')
      .insert({ owner_id: user.id, name: '' })
      .select('id, owner_id, name, country, logo_path')
      .single();

    if (insertError) {
      // Гонка: страница уже была отрендерена параллельно (например, из-за
      // prefetch ссылки) и организация создана другим запросом — перечитываем.
      const { data: existing } = await supabase
        .from('organizations')
        .select('id, owner_id, name, country, logo_path')
        .eq('owner_id', user.id)
        .maybeSingle();
      organization = existing;
    } else {
      organization = created;
    }
  }

  if (!organization) {
    return <p className="text-sm text-red-600">Не удалось загрузить организацию.</p>;
  }

  const { data: requisites } = await supabase
    .from('requisites')
    .select('id, field_key, field_label, field_value, sort_order')
    .eq('owner_type', 'organization')
    .eq('owner_id', organization.id)
    .order('sort_order');

  let logoUrl: string | null = null;
  if (organization.logo_path) {
    const { data } = await supabase.storage
      .from('logos')
      .createSignedUrl(organization.logo_path, 3600);
    logoUrl = data?.signedUrl ?? null;
  }

  return (
    <OrganizationCard
      organization={organization}
      requisites={requisites ?? []}
      initialLogoUrl={logoUrl}
    />
  );
}
