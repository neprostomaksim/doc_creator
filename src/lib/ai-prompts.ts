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

/**
 * Промпт авторазметки: ИИ находит в шаблоне места для подстановки данных и
 * привязывает их к реквизитам сторон, датам, суммам и т.п. Возвращает список
 * полей со ссылкой на фрагмент (unit_id) и точной подстрокой (text).
 */
export function buildAutoMarkupPrompt(params: {
  units: { unit_id: string; text: string }[];
  orgRequisites: { field_key: string; field_label: string }[];
  clientRequisites: { field_key: string; field_label: string }[];
}): string {
  const orgList = params.orgRequisites.length
    ? params.orgRequisites.map((r) => `${r.field_key} — ${r.field_label}`).join('\n')
    : '(список пуст)';
  const clientList = params.clientRequisites.length
    ? params.clientRequisites.map((r) => `${r.field_key} — ${r.field_label}`).join('\n')
    : '(список пуст)';

  return `Ты размечаешь шаблон договора: находишь конкретные места, которые при создании нового договора нужно заменять данными. Это реквизиты сторон (название/ФИО, ИНН, УНП, ОГРН, адрес, расчётный счёт, банк, БИК), номер и дата договора, город, суммы денег, сроки.

Тебе дан документ как список фрагментов текста (unit_id и text). Верни СТРОГО валидный JSON-объект без пояснений и без markdown-обёртки, вида:
{"fields":[
  {"unit_id":"...", "text":"точная подстрока из фрагмента", "name":"Короткое название поля", "source_type":"org_requisite|client_requisite|manual", "field_key":"inn или null", "input_type":"text|number|date|amount или null"}
]}

Правила:
- text — ТОЧНАЯ подстрока из соответствующего фрагмента, копируй символ в символ (именно то значение, которое будет меняться, без окружающих слов вроде «ИНН:»).
- source_type = "org_requisite", если это реквизит вашей стороны (Исполнитель/Продавец), "client_requisite" — реквизит другой стороны (Заказчик/Покупатель/Клиент), иначе "manual".
- field_key: для org_requisite и client_requisite подбери подходящий ключ из списков ниже; если подходящего нет — верни null и поставь source_type "manual".
- input_type: только для manual — "date" для дат, "amount" для денежных сумм, "number" для прочих чисел, "text" для остального. Для реквизитов — null.
- Не размечай названия разделов, служебные слова и общий текст пунктов — только конкретные подставляемые значения.
- Если сомневаешься, к какой стороне относится реквизит, используй "manual".

Реквизиты вашей организации (field_key — подпись):
${orgList}

Реквизиты клиента (field_key — подпись):
${clientList}

Документ (фрагменты):
${JSON.stringify(params.units)}`;
}
