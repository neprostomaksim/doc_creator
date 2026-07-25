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
      <h1 className="mb-4 text-2xl font-semibold text-fg">Новый материал</h1>

      <form onSubmit={handleSubmit} className="space-y-4 card p-4">
        <div>
          <label className="label">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Тип</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MaterialType)}
            className="input-field"
          >
            {MATERIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {MATERIAL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Теги (через запятую)</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="например: онлайн, курс, 3 месяца"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Текст</label>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={6}
            placeholder="Введите текст материала или загрузите файл ниже"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">
            Или файл (.docx, .pdf, .txt)
          </label>
          <input
            type="file"
            accept=".docx,.pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          <p className="mt-1 text-xs text-muted">
            Из файла извлечём текст и сохраним его вместе с файлом.
          </p>
        </div>

        {error && <p className="rounded-lg px-3 py-2 text-sm text-[var(--danger)] bg-[var(--danger-soft)]">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
