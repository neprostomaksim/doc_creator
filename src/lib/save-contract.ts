import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeFilenamePart } from './sanitize-filename';
import type { Block } from './template-types';

/**
 * Сохраняет готовый .docx: кладёт файл в бакет contracts, создаёт дело
 * (или новую версию в переданном деле) и запись версии. Возвращает
 * подписанную ссылку и осмысленное имя файла. Используется и strict-, и
 * AI-режимами.
 */
export async function saveContractVersion(
  supabase: SupabaseClient,
  userId: string,
  params: {
    clientId: string;
    clientName: string;
    mode: 'strict' | 'assisted' | 'generative';
    templateId: string | null;
    blocks: Block[];
    data: Record<string, unknown>;
    docxBuffer: Buffer;
    caseId?: string | null;
    caseTitle?: string | null;
  },
): Promise<
  | { ok: true; url: string | null; filename: string; caseId: string; versionNumber: number }
  | { ok: false; error: string }
> {
  const storagePath = `${userId}/${crypto.randomUUID()}.docx`;
  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(storagePath, params.docxBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

  if (uploadError) return { ok: false, error: 'Не удалось сохранить готовый файл' };

  let resolvedCaseId = params.caseId ?? null;
  let versionNumber = 1;

  if (resolvedCaseId) {
    const { data: lastVersion } = await supabase
      .from('contract_versions')
      .select('version_number')
      .eq('case_id', resolvedCaseId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    versionNumber = (lastVersion?.version_number ?? 0) + 1;
  } else {
    const title = params.caseTitle?.trim() || `Договор с ${params.clientName}`;
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({ user_id: userId, client_id: params.clientId, title, status: 'draft' })
      .select('id')
      .single();
    if (caseError || !newCase) return { ok: false, error: 'Не удалось создать дело' };
    resolvedCaseId = newCase.id;
  }

  const { error: versionError } = await supabase.from('contract_versions').insert({
    case_id: resolvedCaseId,
    version_number: versionNumber,
    mode: params.mode,
    template_id: params.templateId,
    blocks: params.blocks,
    data: params.data,
    docx_path: storagePath,
  });

  if (versionError) return { ok: false, error: 'Не удалось сохранить версию договора' };

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Договор_${sanitizeFilenamePart(params.clientName)}_${dateStr}.docx`;
  const { data: signed } = await supabase.storage
    .from('contracts')
    .createSignedUrl(storagePath, 3600);

  return {
    ok: true,
    url: signed?.signedUrl ?? null,
    filename,
    caseId: resolvedCaseId as string,
    versionNumber,
  };
}
