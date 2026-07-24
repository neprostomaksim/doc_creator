import type { Block } from './template-types';

const FORMAT_SPEC = `Структура документа — это JSON-объект вида {"blocks": [...]}. Допустимые блоки:
- {"type":"title","text":"..."} — заголовок документа
- {"type":"heading","number":"1","text":"НАЗВАНИЕ РАЗДЕЛА"} — раздел
- {"type":"clause","number":"1.1","text":"..."} — пункт
- {"type":"paragraph","text":"..."} — обычный абзац
- {"type":"list","items":["...","..."]} — список
- {"type":"table","rows":[["...","..."],["...","..."]]} — таблица

Правила ответа:
- Верни СТРОГО валидный JSON-объект {"blocks":[...]} без пояснений и без markdown-обёртки.
- Нумерацию пунктов сохраняй согласованной.
- Пиши на русском, в деловом юридическом стиле.
- Не придумывай конкретные реквизиты, суммы и даты, если их нет во входных данных — оставляй общие формулировки или плейсхолдеры.`;

/** Промпт для режима assisted: точечная правка существующей структуры. */
export function buildEditPrompt(blocks: Block[], instruction: string): string {
  return `Ты — помощник юриста, который редактирует структуру договора.

${FORMAT_SPEC}

Текущая структура договора:
${JSON.stringify({ blocks }, null, 2)}

Задача пользователя: ${instruction}

Внеси только запрошенные изменения, остальное оставь как есть. Верни ПОЛНУЮ обновлённую структуру целиком.`;
}

/** Промпт для режима generative: сборка структуры договора с нуля. */
export function buildGeneratePrompt(params: {
  description: string;
  examples: string[];
  materials: { name: string; content: string }[];
}): string {
  const examplesText = params.examples.length
    ? `Примеры договоров пользователя (ориентируйся на их стиль и структуру):\n${params.examples
        .map((e, i) => `--- Пример ${i + 1} ---\n${e}`)
        .join('\n\n')}`
    : 'Примеры не предоставлены — используй типовую структуру договора.';

  const materialsText = params.materials.length
    ? `Материалы, которые нужно учесть в договоре:\n${params.materials
        .map((m) => `--- ${m.name} ---\n${m.content}`)
        .join('\n\n')}`
    : 'Дополнительные материалы не предоставлены.';

  return `Ты — помощник юриста, который составляет договор с нуля.

${FORMAT_SPEC}

${examplesText}

${materialsText}

Что нужно составить: ${params.description}

Собери полную структуру договора: заголовок, разделы с нумерацией, пункты, при необходимости списки и таблицы. Верни СТРОГО валидный JSON-объект {"blocks":[...]}.`;
}
