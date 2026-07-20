'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MarkFieldDialog } from './mark-field-dialog';
import { isMarkableBlock, type Block, type TemplateField } from '@/lib/template-types';

type RequisiteOption = { field_key: string; field_label: string };

const SOURCE_LABELS: Record<string, (field: TemplateField) => string> = {
  org_requisite: (f) => `Реквизит организации: ${(f.source as { field_label: string }).field_label}`,
  client_requisite: (f) => `Реквизит клиента: ${(f.source as { field_label: string }).field_label}`,
  manual: (f) => {
    const labels = { text: 'Текст', number: 'Число', date: 'Дата', amount: 'Сумма' };
    const type = (f.source as { input_type: keyof typeof labels }).input_type;
    return `Ручной ввод (${labels[type]})`;
  },
  material: () => 'Материал из библиотеки',
  signature: () => 'Место подписи',
  stamp: () => 'Место печати',
};

function describeSource(field: TemplateField): string {
  return SOURCE_LABELS[field.source.type]?.(field) ?? field.source.type;
}

function renderTextWithPlaceholders(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, index) =>
    /^\{\{[^}]+\}\}$/.test(part) ? (
      <mark key={index} className="rounded bg-amber-100 px-1 text-amber-800">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function TemplateMarkupEditor({
  templateId,
  name: initialName,
  category: initialCategory,
  initialBlocks,
  initialFields,
  orgRequisites,
  clientRequisites,
}: {
  templateId: string;
  name: string;
  category: string | null;
  initialBlocks: Block[];
  initialFields: TemplateField[];
  orgRequisites: RequisiteOption[];
  clientRequisites: RequisiteOption[];
}) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory ?? '');
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [fields, setFields] = useState<TemplateField[]>(initialFields);
  const [selection, setSelection] = useState<{ blockId: string; text: string } | null>(null);
  const [dialogBlockId, setDialogBlockId] = useState<string | null>(null);

  const supabase = createClient();
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setSelection(null);
        return;
      }
      for (const [blockId, el] of blockRefs.current) {
        if (el.contains(sel.anchorNode) && el.contains(sel.focusNode)) {
          setSelection({ blockId, text });
          return;
        }
      }
      setSelection(null);
    }

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  async function persist(patch: { blocks?: Block[]; fields?: TemplateField[] }) {
    await supabase.from('templates').update(patch).eq('id', templateId);
  }

  async function persistMeta(patch: { name?: string; category?: string | null }) {
    await supabase.from('templates').update(patch).eq('id', templateId);
  }

  function addField(field: TemplateField, appendToEnd = false) {
    const newBlocks = blocks.map((block) => {
      if (block.id !== field.block_id || !isMarkableBlock(block)) return block;
      const newText = appendToEnd
        ? `${block.text} ${field.placeholder}`.trim()
        : block.text.replace(field.original_text, field.placeholder);
      return { ...block, text: newText };
    });
    const newFields = [...fields, field];
    setBlocks(newBlocks);
    setFields(newFields);
    persist({ blocks: newBlocks, fields: newFields });
  }

  function removeField(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const newBlocks = blocks.map((block) => {
      if (block.id !== field.block_id || !isMarkableBlock(block)) return block;
      return { ...block, text: block.text.replace(field.placeholder, field.original_text).trim() };
    });
    const newFields = fields.filter((f) => f.id !== fieldId);
    setBlocks(newBlocks);
    setFields(newFields);
    persist({ blocks: newBlocks, fields: newFields });
  }

  function handleDialogConfirm(field: TemplateField) {
    addField(field);
    setDialogBlockId(null);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  function insertSignatureOrStamp(blockId: string, type: 'signature' | 'stamp') {
    const field: TemplateField = {
      id: crypto.randomUUID(),
      name: type === 'signature' ? 'Место подписи' : 'Место печати',
      placeholder: type === 'signature' ? '{{signature}}' : '{{stamp}}',
      source: { type },
      block_id: blockId,
      original_text: '',
    };
    addField(field, true);
  }

  const hasSignature = fields.some((f) => f.source.type === 'signature');
  const hasStamp = fields.some((f) => f.source.type === 'stamp');
  const existingPlaceholderKeys = fields.map((f) => f.placeholder.slice(2, -2));

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Название шаблона</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => persistMeta({ name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Категория</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onBlur={(e) => persistMeta({ category: e.target.value || null })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          {blocks.length === 0 && (
            <p className="text-sm text-gray-500">Не удалось распознать текст в этом файле.</p>
          )}

          {blocks.map((block) => {
            if (block.type === 'list') {
              return (
                <ul key={block.id} className="list-disc space-y-1 pl-5 text-sm text-gray-800">
                  {block.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              );
            }

            if (block.type === 'table') {
              return (
                <div key={block.id} className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {block.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="border border-gray-200 px-2 py-1">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            const isTitle = block.type === 'title';
            const textClassName = isTitle
              ? 'text-center font-semibold text-gray-900'
              : block.type === 'heading'
                ? 'font-medium text-gray-900'
                : 'text-sm text-gray-800';

            return (
              <div key={block.id}>
                <div className={textClassName}>
                  {(block.type === 'heading' || block.type === 'clause') && (
                    <span className="mr-2 text-gray-500">{block.number}</span>
                  )}
                  <span
                    ref={(el) => {
                      if (el) blockRefs.current.set(block.id, el);
                      else blockRefs.current.delete(block.id);
                    }}
                  >
                    {renderTextWithPlaceholders(block.text)}
                  </span>
                </div>

                {selection?.blockId === block.id && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-2 py-1 text-xs">
                    <span className="truncate text-gray-500">Выделено: «{selection.text}»</span>
                    <button
                      type="button"
                      onClick={() => setDialogBlockId(block.id)}
                      className="rounded-md bg-gray-900 px-2 py-1 font-medium text-white"
                    >
                      Сделать полем
                    </button>
                  </div>
                )}

                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  {!hasSignature && (
                    <button
                      type="button"
                      onClick={() => insertSignatureOrStamp(block.id, 'signature')}
                      className="hover:text-gray-700"
                    >
                      + место для подписи
                    </button>
                  )}
                  {!hasStamp && (
                    <button
                      type="button"
                      onClick={() => insertSignatureOrStamp(block.id, 'stamp')}
                      className="hover:text-gray-700"
                    >
                      + место для печати
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-fit rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Поля шаблона</h2>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-500">
              Выделите текст в договоре слева и нажмите «Сделать полем».
            </p>
          ) : (
            <ul className="space-y-2">
              {fields.map((field) => (
                <li key={field.id} className="rounded-lg border border-gray-200 p-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{field.name}</p>
                      <p className="truncate text-xs text-gray-500">{describeSource(field)}</p>
                      <p className="truncate text-xs text-gray-400">{field.placeholder}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="shrink-0 text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Снять
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {dialogBlockId && selection && (
        <MarkFieldDialog
          blockId={dialogBlockId}
          selectedText={selection.text}
          orgRequisites={orgRequisites}
          clientRequisites={clientRequisites}
          existingPlaceholderKeys={existingPlaceholderKeys}
          onConfirm={handleDialogConfirm}
          onClose={() => setDialogBlockId(null)}
        />
      )}
    </div>
  );
}
