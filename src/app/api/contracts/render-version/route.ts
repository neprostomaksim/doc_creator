import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildDocxFromBlocks } from '@/lib/build-docx';
import { sanitizeFilenamePart } from '@/lib/sanitize-filename';
import { normalizeBlocks } from '@/lib/template-types';

export const runtime = 'nodejs';

/** Пере-собирает .docx текущей версии из её (возможно отредактированных) блоков. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { versionId, blocks: rawBlocks } = (await request.json()) as {
    versionId: string;
    blocks: unknown;
  };

  const { data: version } = await supabase
    .from('contract_versions')
    .select('id, case:cases(title, client:clients(name))')
    .eq('id', versionId)
    .single();

  if (!version) return NextResponse.json({ error: 'Версия не найдена' }, { status: 404 });

  const caseRow = (Array.isArray(version.case) ? version.case[0] : version.case) as
    | { title: string; client: { name: string } | { name: string }[] | null }
    | null;
  const client = caseRow
    ? ((Array.isArray(caseRow.client) ? caseRow.client[0] : caseRow.client) as { name: string } | null)
    : null;

  const blocks = normalizeBlocks(rawBlocks);
  if (blocks.length === 0) {
    return NextResponse.json({ error: 'Документ пуст' }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await buildDocxFromBlocks(blocks);
  } catch {
    return NextResponse.json({ error: 'Не удалось собрать документ' }, { status: 500 });
  }

  const storagePath = `${user.id}/${crypto.randomUUID()}.docx`;
  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(storagePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  if (uploadError) return NextResponse.json({ error: 'Не удалось сохранить файл' }, { status: 500 });

  await supabase
    .from('contract_versions')
    .update({ blocks, docx_path: storagePath })
    .eq('id', versionId);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Договор_${sanitizeFilenamePart(client?.name ?? 'клиент')}_${dateStr}.docx`;
  const { data: signed } = await supabase.storage
    .from('contracts')
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({ url: signed?.signedUrl ?? null, filename });
}
