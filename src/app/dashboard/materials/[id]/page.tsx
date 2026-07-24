import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MaterialEditor } from '@/components/material-editor';

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from('materials')
    .select('id, name, type, content_text, tags, file_path')
    .eq('id', id)
    .single();

  if (!material) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">{material.name}</h1>
      <MaterialEditor material={material} />
    </div>
  );
}
