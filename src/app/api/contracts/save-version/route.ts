import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildDocxFromBlocks } from '@/lib/build-docx';
import { saveContractVersion } from '@/lib/save-contract';
import { normalizeBlocks } from '@/lib/template-types';

export const runtime = 'nodejs';

/** Сохраняет текущие блоки как НОВУЮ версию в том же деле (v+1). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { caseId, blocks: rawBlocks } = (await request.json()) as {
    caseId: string;
    blocks: unknown;
  };

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, client_id, client:clients(name)')
    .eq('id', caseId)
    .single();

  if (!caseRow) return NextResponse.json({ error: 'Дело не найдено' }, { status: 404 });

  const client = (Array.isArray(caseRow.client) ? caseRow.client[0] : caseRow.client) as
    | { name: string }
    | null;

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

  const result = await saveContractVersion(supabase, user.id, {
    clientId: caseRow.client_id,
    clientName: client?.name ?? 'клиент',
    mode: 'generative',
    templateId: null,
    blocks,
    data: { editedInBlockEditor: true },
    docxBuffer: buffer,
    caseId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({
    url: result.url,
    filename: result.filename,
    versionNumber: result.versionNumber,
  });
}
