import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BlockEditor } from '@/components/block-editor';
import { normalizeBlocks } from '@/lib/template-types';

export default async function VersionEditorPage({
  params,
}: {
  params: Promise<{ caseId: string; versionId: string }>;
}) {
  const { caseId, versionId } = await params;
  const supabase = await createClient();

  const { data: version } = await supabase
    .from('contract_versions')
    .select('id, case_id, version_number, blocks')
    .eq('id', versionId)
    .single();

  if (!version || version.case_id !== caseId) notFound();

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content')
    .eq('version_id', versionId)
    .order('created_at');

  return (
    <div>
      <Link
        href={`/dashboard/contracts/${caseId}`}
        className="mb-3 inline-block text-sm text-gray-500 hover:text-gray-900"
      >
        ← Назад к делу
      </Link>
      <BlockEditor
        versionId={version.id}
        caseId={caseId}
        versionNumber={version.version_number}
        initialBlocks={normalizeBlocks(version.blocks)}
        initialMessages={(messages ?? []) as { id: string; role: 'user' | 'assistant'; content: string }[]}
      />
    </div>
  );
}
