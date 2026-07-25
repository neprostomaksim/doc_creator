'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Укажите название клиента');
      return;
    }
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Сессия истекла, войдите заново');
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: name.trim(),
        country: country.trim() || null,
        contact_person: contactPerson.trim() || null,
        notes: notes.trim() || null,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      setError('Не удалось создать клиента');
      setSaving(false);
      return;
    }

    router.push(`/dashboard/clients/${data.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold text-fg">Новый клиент</h1>

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
          <label className="label">Страна</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Контактное лицо</label>
          <input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Заметки</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input-field"
          />
        </div>

        {error && <p className="rounded-lg px-3 py-2 text-sm text-[var(--danger)] bg-[var(--danger-soft)]">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? 'Создаём…' : 'Создать клиента'}
        </button>
      </form>
    </div>
  );
}
