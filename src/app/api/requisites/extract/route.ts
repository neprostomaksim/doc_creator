import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractText } from '@/lib/extract-text';
import { generateJson, resolveGeminiKey, GEMINI_FLASH } from '@/lib/gemini';
import { buildExtractRequisitesPrompt } from '@/lib/ai-prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Извлекает реквизиты из загруженного документа (.docx/.pdf/.txt) через ИИ. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
  }

  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await extractText(buffer, file.name);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось прочитать файл';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'В файле не найден текст' }, { status: 400 });
  }

  const apiKey = await resolveGeminiKey(supabase);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Не задан ключ Gemini. Добавьте свой ключ в Настройках → Ключи ИИ.' },
      { status: 400 },
    );
  }

  try {
    const raw = await generateJson(GEMINI_FLASH, buildExtractRequisitesPrompt(text), apiKey);
    const list = (raw as { requisites?: unknown }).requisites;
    const requisites = Array.isArray(list)
      ? list
          .map((r) => {
            const o = r as Record<string, unknown>;
            return {
              label: typeof o.label === 'string' ? o.label.trim() : '',
              value: typeof o.value === 'string' ? o.value.trim() : '',
            };
          })
          .filter((r) => r.label)
      : [];

    return NextResponse.json({ requisites });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось разобрать документ';
    return NextResponse.json({ error: `ИИ не смог извлечь реквизиты: ${message}` }, { status: 502 });
  }
}
