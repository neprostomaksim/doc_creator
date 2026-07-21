import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TemplateMarkupEditor } from '@/components/template-markup-editor';
import { normalizeBlocks, type TemplateField } from '@/lib/template-types';

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template } = await supabase
    .from('templates')
    .select('id, name, category, blocks, fields')
    .eq('id', id)
    .single();

  if (!template) notFound();

  const { data: organization } = await supabase
    .from('organizations')
    .select('id')
    .single();

  const { data: orgRequisites } = organization
    ? await supabase
        .from('requisites')
        .select('field_key, field_label')
        .eq('owner_type', 'organization')
        .eq('owner_id', organization.id)
        .order('sort_order')
    : { data: [] };

  const { data: clients } = await supabase.from('clients').select('id');
  const clientIds = (clients ?? []).map((c) => c.id);

  let clientRequisites: { field_key: string; field_label: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from('requisites')
      .select('field_key, field_label')
      .eq('owner_type', 'client')
      .in('owner_id', clientIds);

    const seen = new Map<string, string>();
    for (const row of data ?? []) {
      if (!seen.has(row.field_key)) seen.set(row.field_key, row.field_label);
    }
    clientRequisites = Array.from(seen, ([field_key, field_label]) => ({ field_key, field_label }));
  }

  return (
    <TemplateMarkupEditor
      templateId={template.id}
      name={template.name}
      category={template.category}
      initialBlocks={normalizeBlocks(template.blocks)}
      initialFields={(template.fields ?? []) as TemplateField[]}
      orgRequisites={orgRequisites ?? []}
      clientRequisites={clientRequisites}
    />
  );
}
