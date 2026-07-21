import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderContractDocx, type FieldResolution } from '@/lib/render-contract';
import { getPngDimensions } from '@/lib/png-dimensions';
import { sanitizeFilenamePart } from '@/lib/sanitize-filename';
import { normalizeBlocks, type TemplateField } from '@/lib/template-types';

export const runtime = 'nodejs';

const SIGNATURE_WIDTH_CM = 5; // ~50 мм
const STAMP_WIDTH_CM = 4; // ~40 мм

type GenerateBody = {
  templateId: string;
  clientId: string;
  values: Record<string, string>;
  signatureId?: string | null;
  stampId?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const body = (await request.json()) as GenerateBody;
  const { templateId, clientId, values, signatureId, stampId } = body;

  if (!templateId || !clientId) {
    return NextResponse.json({ error: 'Не хватает данных' }, { status: 400 });
  }

  const { data: template } = await supabase
    .from('templates')
    .select('blocks, fields, source_file_path')
    .eq('id', templateId)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
  }

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', clientId).single();
  if (!client) {
    return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 });
  }

  const { data: organization } = await supabase.from('organizations').select('id').single();

  const { data: orgRequisites } = organization
    ? await supabase
        .from('requisites')
        .select('field_key, field_value')
        .eq('owner_type', 'organization')
        .eq('owner_id', organization.id)
    : { data: [] };

  const { data: clientRequisites } = await supabase
    .from('requisites')
    .select('field_key, field_value')
    .eq('owner_type', 'client')
    .eq('owner_id', clientId);

  const orgValues = new Map((orgRequisites ?? []).map((r) => [r.field_key, r.field_value]));
  const clientValues = new Map((clientRequisites ?? []).map((r) => [r.field_key, r.field_value]));

  const { data: templateFile, error: downloadError } = await supabase.storage
    .from('templates')
    .download(template.source_file_path);

  if (downloadError || !templateFile) {
    return NextResponse.json({ error: 'Не удалось загрузить файл шаблона' }, { status: 500 });
  }

  const templateBuffer = Buffer.from(await templateFile.arrayBuffer());

  async function loadStampImage(
    stampRowId: string | null | undefined,
    widthCm: number,
  ): Promise<{ width: number; height: number; data: string; extension: '.png' } | null> {
    if (!stampRowId) return null;
    const { data: stampRow } = await supabase
      .from('stamps')
      .select('file_path')
      .eq('id', stampRowId)
      .single();
    if (!stampRow) return null;

    const { data: file } = await supabase.storage.from('stamps').download(stampRow.file_path);
    if (!file) return null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const dims = getPngDimensions(buffer);
    const height = dims ? widthCm * (dims.height / dims.width) : widthCm;

    return { width: widthCm, height, data: buffer.toString('base64'), extension: '.png' };
  }

  const [signatureImage, stampImage] = await Promise.all([
    loadStampImage(signatureId, SIGNATURE_WIDTH_CM),
    loadStampImage(stampId, STAMP_WIDTH_CM),
  ]);

  function resolve(field: TemplateField): FieldResolution {
    switch (field.source.type) {
      case 'org_requisite':
        return { kind: 'text', value: orgValues.get(field.source.field_key) ?? '' };
      case 'client_requisite':
        return {
          kind: 'text',
          value: clientValues.get(field.source.field_key) ?? values[field.id] ?? '',
        };
      case 'manual':
        return { kind: 'text', value: values[field.id] ?? '' };
      case 'signature':
        return signatureImage ? { kind: 'image', image: signatureImage } : { kind: 'skip' };
      case 'stamp':
        return stampImage ? { kind: 'image', image: stampImage } : { kind: 'skip' };
      default:
        return { kind: 'text', value: '' };
    }
  }

  let renderResult;
  try {
    renderResult = await renderContractDocx({
      templateBuffer,
      blocks: normalizeBlocks(template.blocks),
      fields: (template.fields ?? []) as TemplateField[],
      resolve,
    });
  } catch {
    return NextResponse.json({ error: 'Не удалось собрать документ' }, { status: 500 });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const suggestedName = `Договор_${sanitizeFilenamePart(client.name)}_${dateStr}.docx`;
  const storagePath = `${user.id}/${crypto.randomUUID()}.docx`;

  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(storagePath, renderResult.buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Не удалось сохранить готовый файл' }, { status: 500 });
  }

  // Имя файла при скачивании задаёт браузер (см. handleDownload в contract-wizard.tsx) —
  // Supabase некорректно кодирует кириллицу в заголовке Content-Disposition.
  const { data: signed } = await supabase.storage.from('contracts').createSignedUrl(storagePath, 3600);

  const warnings = [
    ...renderResult.unfilledFieldNames.map((name) => `Поле «${name}» осталось пустым`),
    ...renderResult.unmatchedFieldNames.map(
      (name) => `Не удалось найти в документе место для поля «${name}»`,
    ),
  ];

  return NextResponse.json({
    url: signed?.signedUrl ?? null,
    filename: suggestedName,
    warnings,
  });
}
