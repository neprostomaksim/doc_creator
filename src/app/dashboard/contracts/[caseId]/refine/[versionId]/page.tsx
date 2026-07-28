import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RefineChat } from '@/components/refine-chat';

export default async function RefinePage({
  params,
}: {
  params: Promise<{ caseId: string; versionId: string }>;
}) {
  const { caseId, versionId } = await params;
  const supabase = await createClient();

  const { data: version } = await supabase
    .from('contract_versions')
    .select('id, case_id, version_number, docx_path')
    .eq('id', versionId)
    .single();

  if (!version || version.case_id !== caseId) notFound();

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content')
    .eq('version_id', versionId)
    .order('created_at');

  let url: string | null = null;
  if (version.docx_path) {
    const { data } = await supabase.storage.from('contracts').createSignedUrl(version.docx_path, 3600);
    url = data?.signedUrl ?? null;
  }

  const dateStr = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Link
        href={`/dashboard/contracts/${caseId}`}
        className="mb-3 inline-block text-sm text-muted hover:text-fg"
      >
        ← Назад к делу
      </Link>
      <RefineChat
        versionId={version.id}
        versionNumber={version.version_number}
        initialMessages={(messages ?? []) as { id: string; role: 'user' | 'assistant'; content: string }[]}
        initialUrl={url}
        initialFilename={`Договор_${dateStr}.docx`}
      />
    </div>
  );
}
