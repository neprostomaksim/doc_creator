export type Block =
  | { id: string; type: 'title'; text: string }
  | { id: string; type: 'heading'; number: string; text: string }
  | { id: string; type: 'clause'; number: string; text: string }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'list'; items: string[] }
  | { id: string; type: 'table'; rows: string[][] };

export type MarkableBlock = Extract<
  Block,
  { type: 'title' | 'heading' | 'clause' | 'paragraph' }
>;

export function isMarkableBlock(block: Block): block is MarkableBlock {
  return (
    block.type === 'title' ||
    block.type === 'heading' ||
    block.type === 'clause' ||
    block.type === 'paragraph'
  );
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
  block_id: string;
  original_text: string;
};
