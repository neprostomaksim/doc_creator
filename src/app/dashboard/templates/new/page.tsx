'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !file) {
      setError('Укажите название и выберите файл .docx');
      return;
    }
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.set('name', name.trim());
    formData.set('category', category.trim());
    formData.set('file', file);

    const response = await fetch('/api/templates/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Не удалось загрузить шаблон');
      setUploading(false);
      return;
    }

    const { id } = await response.json();
    router.push(`/dashboard/templates/${id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold text-fg">Новый шаблон</h1>

      <form onSubmit={handleSubmit} className="space-y-4 card p-4">
        <div>
          <label className="label">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, «Договор оказания услуг»"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Категория</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Например, «Услуги»"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Файл договора (.docx)</label>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        {error && <p className="rounded-lg px-3 py-2 text-sm text-[var(--danger)] bg-[var(--danger-soft)]">{error}</p>}

        <button
          type="submit"
          disabled={uploading}
          className="btn btn-primary w-full"
        >
          {uploading ? 'Загружаем и разбираем…' : 'Загрузить'}
        </button>
      </form>
    </div>
  );
}
