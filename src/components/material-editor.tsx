'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS, type MaterialType } from '@/lib/material-types';

type Material = {
  id: string;
  name: string;
  type: MaterialType;
  content_text: string;
  tags: string[];
  file_path: string | null;
};

export function MaterialEditor({ material }: { material: Material }) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(material.name);
  const [type, setType] = useState<MaterialType>(material.type);
  const [tags, setTags] = useState(material.tags.join(', '));
  const [contentText, setContentText] = useState(material.content_text);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function handleSave() {
    await supabase
      .from('materials')
      .update({
        name: name.trim(),
        type,
        content_text: contentText,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      .eq('id', material.id);
    setSavedAt(new Date().toLocaleTimeString('ru-RU'));
  }

  async function handleDelete() {
    if (!confirm('Удалить материал?')) return;
    await supabase.from('materials').delete().eq('id', material.id);
    router.push('/dashboard/materials');
  }

  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Название</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Тип</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MaterialType)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          {MATERIAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {MATERIAL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Теги (через запятую)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Текст</label>
        <textarea
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        {material.file_path && (
          <p className="mt-1 text-xs text-gray-400">
            Текст извлечён из загруженного файла. Можно править вручную.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm font-medium text-red-600 hover:text-red-800"
        >
          Удалить
        </button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-gray-400">Сохранено в {savedAt}</span>}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
