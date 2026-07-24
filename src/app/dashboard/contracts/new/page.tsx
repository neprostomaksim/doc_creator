import { createClient } from '@/lib/supabase/server';
import { ContractWizard } from '@/components/contract-wizard';
import type { TemplateField } from '@/lib/template-types';

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: initialClientId } = await searchParams;
  const supabase = await createClient();

  const { data: clients } = await supabase.from('clients').select('id, name').order('name');

  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, category, fields')
    .order('name');

  const { data: organization } = await supabase.from('organizations').select('id').single();

  const { data: orgRequisites } = organization
    ? await supabase
        .from('requisites')
        .select('field_key, field_label, field_value')
        .eq('owner_type', 'organization')
        .eq('owner_id', organization.id)
    : { data: [] };

  const { data: stamps } = await supabase
    .from('stamps')
    .select('id, name, type')
    .order('created_at', { ascending: false });

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name')
    .order('created_at', { ascending: false });

  const { data: exampleCases } = await supabase
    .from('cases')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <ContractWizard
      clients={clients ?? []}
      templates={(templates ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        fields: (t.fields ?? []) as TemplateField[],
      }))}
      orgRequisites={orgRequisites ?? []}
      stamps={stamps ?? []}
      materials={materials ?? []}
      exampleCases={exampleCases ?? []}
      initialClientId={initialClientId}
    />
  );
}
