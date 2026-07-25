import { createClient } from '@/lib/supabase/server';
import { ClientsList } from '@/components/clients-list';

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, country, contact_person')
    .order('name');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-fg">Клиенты</h1>
      <ClientsList clients={clients ?? []} />
    </div>
  );
}
