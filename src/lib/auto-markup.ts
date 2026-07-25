import { slugifyFieldKey } from './slugify';
import {
  getMarkableUnits,
  updateMarkableUnitText,
  type Block,
  type TemplateField,
  type TemplateFieldSource,
} from './template-types';

export type AutoMarkupProposal = {
  unit_id?: string;
  text?: string;
  name?: string;
  source_type?: string;
  field_key?: string | null;
  input_type?: string | null;
};

type Requisite = { field_key: string; field_label: string };

const MANUAL_TYPES = new Set(['text', 'number', 'date', 'amount']);

/**
 * Превращает предложения ИИ в поля шаблона и подставляет плейсхолдеры в блоки.
 * Чистая функция — легко тестируется без обращения к модели. Предложение
 * пропускается, если его точная подстрока не найдена в указанном фрагменте
 * (защита от порчи документа).
 */
export function applyAutoMarkup(
  initialBlocks: Block[],
  existingFields: TemplateField[],
  proposals: AutoMarkupProposal[],
  orgRequisites: Requisite[],
  clientRequisites: Requisite[],
): { blocks: Block[]; fields: TemplateField[]; added: number } {
  let blocks = initialBlocks;
  const fields = [...existingFields];
  const orgMap = new Map(orgRequisites.map((r) => [r.field_key, r.field_label]));
  const clientMap = new Map(clientRequisites.map((r) => [r.field_key, r.field_label]));
  let added = 0;

  for (const p of proposals) {
    const original = (p.text ?? '').trim();
    const name = (p.name ?? '').trim();
    if (!p.unit_id || original.length < 2 || !name) continue;

    const unit = getMarkableUnits(blocks).find((u) => u.id === p.unit_id);
    if (!unit || !unit.text.includes(original)) continue;

    const existingKeys = fields.map((f) => f.placeholder.slice(2, -2));
    const key = slugifyFieldKey(name, existingKeys);
    const placeholder = `{{${key}}}`;

    let source: TemplateFieldSource;
    if (p.source_type === 'org_requisite' && p.field_key && orgMap.has(p.field_key)) {
      source = { type: 'org_requisite', field_key: p.field_key, field_label: orgMap.get(p.field_key)! };
    } else if (p.source_type === 'client_requisite' && p.field_key && clientMap.has(p.field_key)) {
      source = {
        type: 'client_requisite',
        field_key: p.field_key,
        field_label: clientMap.get(p.field_key)!,
      };
    } else {
      const it = MANUAL_TYPES.has(p.input_type ?? '')
        ? (p.input_type as 'text' | 'number' | 'date' | 'amount')
        : 'text';
      source = { type: 'manual', input_type: it };
    }

    blocks = updateMarkableUnitText(blocks, unit.id, unit.text.replace(original, placeholder));
    fields.push({
      id: crypto.randomUUID(),
      name,
      placeholder,
      source,
      block_id: unit.id,
      original_text: original,
    });
    added += 1;
  }

  return { blocks, fields, added };
}
