import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractText } from '@/lib/extract-text';
import { MATERIAL_TYPES, type MaterialType } from '@/lib/material-types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const formData = await request.formData();
  const name = formData.get('name');
  const typeRaw = formData.get('type');
  const tagsRaw = formData.get('tags');
  const contentText = formData.get('content_text');
  const file = formData.get('file');

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Укажите название материала' }, { status: 400 });
  }

  const type: MaterialType = MATERIAL_TYPES.includes(typeRaw as MaterialType)
    ? (typeRaw as MaterialType)
    : 'other';

  const tags =
    typeof tagsRaw === 'string'
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  let content = typeof contentText === 'string' ? contentText : '';
  let filePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());

    let extracted = '';
    try {
      extracted = await extractText(buffer, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось разобрать файл';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const ext = file.name.slice(file.name.lastIndexOf('.')) || '';
    filePath = `${user.id}/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, buffer, { contentType: file.type || 'application/octet-stream' });

    if (uploadError) {
      return NextResponse.json({ error: 'Не удалось загрузить файл' }, { status: 500 });
    }

    // Текст из файла дополняет введённый вручную (если тот был).
    content = [content, extracted].filter(Boolean).join('\n\n').trim();
  }

  const { data, error: insertError } = await supabase
    .from('materials')
    .insert({
      user_id: user.id,
      name: name.trim(),
      type,
      content_text: content,
      file_path: filePath,
      tags,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    return NextResponse.json({ error: 'Не удалось сохранить материал' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
