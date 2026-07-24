'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS, type MaterialType } from '@/lib/material-types';

export default function NewMaterialPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<MaterialType>('program');
  const [tags, setTags] = useState('');
  const [contentText, setContentText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Укажите название материала');
      return;
    }
    if (!contentText.trim() && !file) {
      setError('Добавьте текст или файл');
      return;
    }
    setError(null);
    setSaving(true);

    const formData = new FormData();
    formData.set('name', name.trim());
    formData.set('type', type);
    formData.set('tags', tags);
    formData.set('content_text', contentText);
    if (file) formData.set('file', file);

    const response = await fetch('/api/materials', { method: 'POST', body: formData });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Не удалось сохранить материал');
      setSaving(false);
      return;
    }

    const { id } = await response.json();
    router.push(`/dashboard/materials/${id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Новый материал</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
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
            placeholder="например: онлайн, курс, 3 месяца"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Текст</label>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={6}
            placeholder="Введите текст материала или загрузите файл ниже"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Или файл (.docx, .pdf, .txt)
          </label>
          <input
            type="file"
            accept=".docx,.pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">
            Из файла извлечём текст и сохраним его вместе с файлом.
          </p>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
