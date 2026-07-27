'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { REQUISITES_PRESETS } from '@/lib/requisites-presets';
import { slugifyFieldKey } from '@/lib/slugify';

export type Requisite = {
  id: string;
  field_key: string;
  field_label: string;
  field_value: string;
  sort_order: number;
};

export function RequisitesEditor({
  ownerType,
  ownerId,
  initialRequisites,
  onPresetApplied,
}: {
  ownerType: 'organization' | 'client';
  ownerId: string;
  initialRequisites: Requisite[];
  onPresetApplied?: (countryLabel: string) => void;
}) {
  const [items, setItems] = useState<Requisite[]>(
    [...initialRequisites].sort((a, b) => a.sort_order - b.sort_order),
  );
  const supabase = createClient();

  function nextSortOrder() {
    return items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
  }

  async function addRow() {
    const label = 'Новое поле';
    const key = slugifyFieldKey(
      label,
      items.map((i) => i.field_key),
    );
    const { data, error } = await supabase
      .from('requisites')
      .insert({
        owner_type: ownerType,
        owner_id: ownerId,
        field_key: key,
        field_label: label,
        field_value: '',
        sort_order: nextSortOrder(),
      })
      .select()
      .single();

    if (!error && data) setItems((prev) => [...prev, data as Requisite]);
  }

  async function applyPreset(presetId: (typeof REQUISITES_PRESETS)[number]['id']) {
    const preset = REQUISITES_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    onPresetApplied?.(preset.countryLabel);

    const existingKeys = items.map((i) => i.field_key);
    const missing = preset.fields.filter((f) => !existingKeys.includes(f.key));
    if (missing.length === 0) return;

    const base = nextSortOrder();
    const rows = missing.map((field, index) => ({
      owner_type: ownerType,
      owner_id: ownerId,
      field_key: field.key,
      field_label: field.label,
      field_value: '',
      sort_order: base + index,
    }));

    const { data, error } = await supabase.from('requisites').insert(rows).select();
    if (!error && data) setItems((prev) => [...prev, ...(data as Requisite[])]);
  }

  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  async function extractFromFile(file: File) {
    setExtracting(true);
    setExtractMsg(null);

    const formData = new FormData();
    formData.set('file', file);
    const response = await fetch('/api/requisites/extract', { method: 'POST', body: formData });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setExtracting(false);
      setExtractMsg(body?.error ?? 'Не удалось извлечь реквизиты');
      return;
    }

    const { requisites } = (await response.json()) as {
      requisites: { label: string; value: string }[];
    };

    const existingKeys = items.map((i) => i.field_key);
    const base = nextSortOrder();
    const rows = requisites.map((r, index) => {
      const key = slugifyFieldKey(r.label, existingKeys);
      existingKeys.push(key);
      return {
        owner_type: ownerType,
        owner_id: ownerId,
        field_key: key,
        field_label: r.label,
        field_value: r.value,
        sort_order: base + index,
      };
    });

    if (rows.length > 0) {
      const { data, error } = await supabase.from('requisites').insert(rows).select();
      if (!error && data) setItems((prev) => [...prev, ...(data as Requisite[])]);
    }

    setExtracting(false);
    setExtractMsg(
      rows.length > 0
        ? `Добавлено полей: ${rows.length}. Проверьте значения ниже.`
        : 'ИИ не нашёл реквизитов в документе.',
    );
  }

  function updateLocal(id: string, patch: Partial<Requisite>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function persist(id: string, patch: Partial<Requisite>) {
    await supabase.from('requisites').update(patch).eq('id', id);
  }

  async function removeRow(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await supabase.from('requisites').delete().eq('id', id);
  }

  async function move(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

    const current = items[index];
    const neighbor = items[swapIndex];
    const reordered = [...items];
    reordered[index] = { ...current, sort_order: neighbor.sort_order };
    reordered[swapIndex] = { ...neighbor, sort_order: current.sort_order };
    reordered.sort((a, b) => a.sort_order - b.sort_order);
    setItems(reordered);

    await Promise.all([
      supabase.from('requisites').update({ sort_order: neighbor.sort_order }).eq('id', current.id),
      supabase.from('requisites').update({ sort_order: current.sort_order }).eq('id', neighbor.id),
    ]);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {REQUISITES_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            className="rounded-full border border-border px-3 py-1 text-sm text-fg hover:bg-surface2"
          >
            {preset.buttonLabel}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-fg hover:bg-surface2">
          {extracting ? 'ИИ извлекает…' : '📄 Извлечь из документа (ИИ)'}
          <input
            type="file"
            accept=".docx,.pdf,.txt"
            disabled={extracting}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) extractFromFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Загрузите договор или карточку предприятия (.docx/.pdf/.txt) — ИИ вытащит реквизиты.
        </p>
        {extractMsg && (
          <p
            className="mt-2 rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)' }}
          >
            {extractMsg}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="flex flex-1 flex-col gap-1 sm:flex-row">
              <input
                value={item.field_label}
                onChange={(e) => updateLocal(item.id, { field_label: e.target.value })}
                onBlur={(e) => persist(item.id, { field_label: e.target.value })}
                placeholder="Название поля"
                className="input-field sm:w-1/3"
              />
              <input
                value={item.field_value}
                onChange={(e) => updateLocal(item.id, { field_value: e.target.value })}
                onBlur={(e) => persist(item.id, { field_value: e.target.value })}
                placeholder="Значение"
                className="input-field sm:flex-1"
              />
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => move(item.id, -1)}
                disabled={index === 0}
                aria-label="Переместить выше"
                className="rounded-md px-2 py-1 text-muted hover:bg-surface2 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(item.id, 1)}
                disabled={index === items.length - 1}
                aria-label="Переместить ниже"
                className="rounded-md px-2 py-1 text-muted hover:bg-surface2 disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => removeRow(item.id)}
                aria-label="Удалить поле"
                className="rounded-md px-2 py-1 text-red-500 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:bg-surface2"
      >
        + Добавить поле
      </button>
    </div>
  );
}
