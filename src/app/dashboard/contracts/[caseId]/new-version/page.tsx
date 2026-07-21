import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractWizard, type WizardPreset } from '@/components/contract-wizard';
import type { TemplateField } from '@/lib/template-types';

export default async function NewVersionPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, client_id')
    .eq('id', caseId)
    .single();

  if (!caseRow) notFound();

  const { data: lastVersion } = await supabase
    .from('contract_versions')
    .select('template_id, data')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastVersion?.template_id) notFound();

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

  const versionData = (lastVersion.data ?? {}) as { values?: Record<string, string> };
  const preset: WizardPreset = {
    caseId: caseRow.id,
    caseTitle: caseRow.title,
    clientId: caseRow.client_id,
    templateId: lastVersion.template_id,
    values: versionData.values ?? {},
  };

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
      preset={preset}
    />
  );
}
