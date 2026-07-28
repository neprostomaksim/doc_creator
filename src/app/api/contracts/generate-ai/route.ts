import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBlocks, resolveGeminiKey, GEMINI_FLASH, GEMINI_PRO } from '@/lib/gemini';
import { buildEditPrompt, buildGeneratePrompt } from '@/lib/ai-prompts';
import { buildDocxFromBlocks } from '@/lib/build-docx';
import { saveContractVersion } from '@/lib/save-contract';
import {
  getMarkableUnits,
  normalizeBlocks,
  unmarkTemplate,
  type Block,
  type TemplateField,
} from '@/lib/template-types';

export const runtime = 'nodejs';
export const maxDuration = 120;

type Body = {
  mode: 'assisted' | 'generative';
  clientId: string;
  caseTitle?: string | null;
  caseId?: string | null;
  templateId?: string | null;
  instruction?: string;
  description?: string;
  exampleCaseIds?: string[];
  materialIds?: string[];
};

/** Плоский текст структуры блоков — для передачи как «пример стиля» модели. */
function blocksToPlainText(blocks: Block[]): string {
  return getMarkableUnits(blocks)
    .map((u) => u.text)
    .filter(Boolean)
    .join('\n');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const body = (await request.json()) as Body;
  const { mode, clientId } = body;

  if (!clientId) return NextResponse.json({ error: 'Не выбран клиент' }, { status: 400 });

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', clientId).single();
  if (!client) return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 });

  const apiKey = await resolveGeminiKey(supabase);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Не задан ключ Gemini. Добавьте свой ключ в Настройках → Ключи ИИ.' },
      { status: 400 },
    );
  }

  let blocks: Block[];
  let templateId: string | null = null;

  try {
    if (mode === 'assisted') {
      const instruction = (body.instruction ?? '').trim();
      if (!body.templateId || !instruction) {
        return NextResponse.json({ error: 'Выберите шаблон и опишите правку' }, { status: 400 });
      }
      templateId = body.templateId;

      const { data: template } = await supabase
        .from('templates')
        .select('blocks, fields')
        .eq('id', body.templateId)
        .single();
      if (!template) return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });

      const materials: { name: string; content: string }[] = [];
      if ((body.materialIds ?? []).length > 0) {
        const { data: rows } = await supabase
          .from('materials')
          .select('name, content_text')
          .in('id', body.materialIds as string[]);
        for (const row of rows ?? []) {
          if (row.content_text) materials.push({ name: row.name, content: row.content_text });
        }
      }

      // Если шаблон размечен ({{плейсхолдеры}}), подставляем обратно реальный
      // текст: правки ИИ идут по настоящему договору, а не по разметке.
      const realBlocks = unmarkTemplate(
        normalizeBlocks(template.blocks),
        (template.fields ?? []) as TemplateField[],
      );
      const prompt = buildEditPrompt(realBlocks, instruction, materials);
      blocks = await generateBlocks(GEMINI_FLASH, prompt, apiKey);
    } else {
      const description = (body.description ?? '').trim();
      if (!description) {
        return NextResponse.json({ error: 'Опишите, какой договор нужен' }, { status: 400 });
      }

      // Примеры стиля — блоки последних версий выбранных дел.
      const examples: string[] = [];
      for (const exampleCaseId of (body.exampleCaseIds ?? []).slice(0, 2)) {
        const { data: version } = await supabase
          .from('contract_versions')
          .select('blocks')
          .eq('case_id', exampleCaseId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (version) {
          const text = blocksToPlainText(normalizeBlocks(version.blocks));
          if (text) examples.push(text);
        }
      }

      const materials: { name: string; content: string }[] = [];
      if ((body.materialIds ?? []).length > 0) {
        const { data: rows } = await supabase
          .from('materials')
          .select('name, content_text')
          .in('id', body.materialIds as string[]);
        for (const row of rows ?? []) {
          if (row.content_text) materials.push({ name: row.name, content: row.content_text });
        }
      }

      const prompt = buildGeneratePrompt({ description, examples, materials });
      blocks = await generateBlocks(GEMINI_PRO, prompt, apiKey);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось обработать запрос';
    return NextResponse.json({ error: `ИИ не справился: ${message}` }, { status: 502 });
  }

  let docxBuffer: Buffer;
  try {
    docxBuffer = await buildDocxFromBlocks(blocks);
  } catch {
    return NextResponse.json({ error: 'Не удалось собрать документ' }, { status: 500 });
  }

  const result = await saveContractVersion(supabase, user.id, {
    clientId,
    clientName: client.name,
    mode,
    templateId,
    blocks,
    data: {
      instruction: body.instruction ?? null,
      description: body.description ?? null,
      materialIds: body.materialIds ?? [],
    },
    docxBuffer,
    caseId: body.caseId ?? null,
    caseTitle: body.caseTitle ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({
    url: result.url,
    filename: result.filename,
    caseId: result.caseId,
    versionNumber: result.versionNumber,
    warnings: [],
  });
}
