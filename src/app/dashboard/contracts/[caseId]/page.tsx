import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CaseDetail, type CaseVersionItem } from '@/components/case-detail';
import type { CaseStatus } from '@/lib/case-status';

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, status, client:clients(id, name)')
    .eq('id', caseId)
    .single();

  if (!caseRow) notFound();

  const { data: versions } = await supabase
    .from('contract_versions')
    .select('id, version_number, mode, docx_path, created_at')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false });

  const versionItems: CaseVersionItem[] = await Promise.all(
    (versions ?? []).map(async (v) => {
      let url: string | null = null;
      if (v.docx_path) {
        const { data } = await supabase.storage.from('contracts').createSignedUrl(v.docx_path, 3600);
        url = data?.signedUrl ?? null;
      }
      return {
        id: v.id,
        versionNumber: v.version_number,
        mode: v.mode,
        createdAt: v.created_at,
        url,
      };
    }),
  );

  const client = (Array.isArray(caseRow.client) ? caseRow.client[0] : caseRow.client) as
    | { id: string; name: string }
    | null;

  return (
    <CaseDetail
      caseId={caseRow.id}
      title={caseRow.title}
      status={caseRow.status as CaseStatus}
      clientName={client?.name ?? '—'}
      versions={versionItems}
    />
  );
}
