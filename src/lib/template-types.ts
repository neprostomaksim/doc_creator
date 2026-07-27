export type TableCell = { id: string; text: string };
export type ListItem = { id: string; text: string };

export type Block =
  | { id: string; type: 'title'; text: string }
  | { id: string; type: 'heading'; number: string; text: string }
  | { id: string; type: 'clause'; number: string; text: string }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'list'; items: ListItem[] }
  | { id: string; type: 'table'; rows: TableCell[][] };

let legacyIdCounter = 0;
function legacyId() {
  legacyIdCounter += 1;
  return `legacy${Date.now().toString(36)}${legacyIdCounter}`;
}

function isTextUnit(value: unknown): value is TableCell {
  return typeof value === 'object' && value !== null && 'id' in value && 'text' in value;
}

/**
 * Надёжно достаёт текст из значения. ИИ иногда возвращает пункт списка или
 * ячейку не строкой, а объектом ({"text":"..."} / {"item":"..."} и т.п.);
 * наивный String(obj) давал «[object Object]». Здесь копаем внутрь объекта.
 */
export function coerceText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const key of ['text', 'item', 'value', 'name', 'content', 'title']) {
      if (typeof o[key] === 'string') return o[key] as string;
    }
    for (const v of Object.values(o)) {
      if (typeof v === 'string') return v;
    }
    return '';
  }
  return String(value);
}

/**
 * Приводит blocks, прочитанные из базы, к текущему формату: в старых
 * шаблонах (до появления разметки по ячейкам таблиц и пунктам списков)
 * items/rows хранились как обычные строки, а не { id, text }.
 */
export function normalizeBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((block) => {
    const b = block as Record<string, unknown>;
    if (b.type === 'list') {
      const items = Array.isArray(b.items) ? b.items : [];
      return {
        ...b,
        items: items.map((item) =>
          isTextUnit(item) ? { ...item, text: coerceText(item.text) } : { id: legacyId(), text: coerceText(item) },
        ),
      } as Block;
    }
    if (b.type === 'table') {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      return {
        ...b,
        rows: rows.map((row: unknown) =>
          (Array.isArray(row) ? row : []).map((cell) =>
            isTextUnit(cell) ? { ...cell, text: coerceText(cell.text) } : { id: legacyId(), text: coerceText(cell) },
          ),
        ),
      } as Block;
    }
    return block as Block;
  });
}

/**
 * Плоский список всех "размечаемых единиц текста" — параграфов/заголовков/
 * пунктов целиком, а также отдельных ячеек таблиц и пунктов списков.
 * field.block_id ссылается на id одной из этих единиц.
 */
export type MarkableUnit = { id: string; text: string };

export function getMarkableUnits(blocks: Block[]): MarkableUnit[] {
  const units: MarkableUnit[] = [];
  for (const block of blocks) {
    if (
      block.type === 'title' ||
      block.type === 'heading' ||
      block.type === 'clause' ||
      block.type === 'paragraph'
    ) {
      units.push({ id: block.id, text: block.text });
    } else if (block.type === 'list') {
      for (const item of block.items) units.push({ id: item.id, text: item.text });
    } else if (block.type === 'table') {
      for (const row of block.rows) for (const cell of row) units.push({ id: cell.id, text: cell.text });
    }
  }
  return units;
}

/** Возвращает новый blocks с текстом единицы unitId, заменённым на newText. */
export function updateMarkableUnitText(blocks: Block[], unitId: string, newText: string): Block[] {
  return blocks.map((block) => {
    if (
      (block.type === 'title' ||
        block.type === 'heading' ||
        block.type === 'clause' ||
        block.type === 'paragraph') &&
      block.id === unitId
    ) {
      return { ...block, text: newText };
    }
    if (block.type === 'list') {
      return {
        ...block,
        items: block.items.map((item) => (item.id === unitId ? { ...item, text: newText } : item)),
      };
    }
    if (block.type === 'table') {
      return {
        ...block,
        rows: block.rows.map((row) =>
          row.map((cell) => (cell.id === unitId ? { ...cell, text: newText } : cell)),
        ),
      };
    }
    return block;
  });
}

export type TemplateFieldSource =
  | { type: 'org_requisite'; field_key: string; field_label: string }
  | { type: 'client_requisite'; field_key: string; field_label: string }
  | { type: 'manual'; input_type: 'text' | 'number' | 'date' | 'amount' }
  | { type: 'material'; material_id: string }
  | { type: 'signature' }
  | { type: 'stamp' };

export type TemplateField = {
  id: string;
  name: string;
  placeholder: string;
  source: TemplateFieldSource;
  /** id единицы текста (см. MarkableUnit) — параграфа, ячейки таблицы или пункта списка. */
  block_id: string;
  original_text: string;
};
