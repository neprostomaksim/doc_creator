import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientCard } from '@/components/client-card';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, country, contact_person, notes')
    .eq('id', id)
    .single();

  if (!client) notFound();

  const { data: requisites } = await supabase
    .from('requisites')
    .select('id, field_key, field_label, field_value, sort_order')
    .eq('owner_type', 'client')
    .eq('owner_id', client.id)
    .order('sort_order');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">{client.name}</h1>
      <ClientCard client={client} requisites={requisites ?? []} />
    </div>
  );
}
