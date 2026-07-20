import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseDocxToBlocks } from '@/lib/docx-to-blocks';

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
  const file = formData.get('file');
  const name = formData.get('name');
  const category = formData.get('category');

  if (!(file instanceof File) || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Не хватает данных для загрузки' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const path = `${user.id}/${crypto.randomUUID()}.docx`;
  const { error: uploadError } = await supabase.storage
    .from('templates')
    .upload(path, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Не удалось загрузить файл' }, { status: 500 });
  }

  let blocks;
  try {
    blocks = await parseDocxToBlocks(buffer);
  } catch {
    return NextResponse.json({ error: 'Не удалось разобрать документ' }, { status: 500 });
  }

  const { data: template, error: insertError } = await supabase
    .from('templates')
    .insert({
      user_id: user.id,
      name: name.trim(),
      category: typeof category === 'string' && category.trim() ? category.trim() : null,
      source_file_path: path,
      blocks,
      fields: [],
    })
    .select('id')
    .single();

  if (insertError || !template) {
    return NextResponse.json({ error: 'Не удалось сохранить шаблон' }, { status: 500 });
  }

  return NextResponse.json({ id: template.id });
}
