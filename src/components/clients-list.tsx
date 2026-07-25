'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Client = {
  id: string;
  name: string;
  country: string | null;
  contact_person: string | null;
};

export function ClientsList({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(query));
  }, [clients, search]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию"
          className="input-field sm:max-w-xs"
        />
        <Link
          href="/dashboard/clients/new"
          className="btn btn-primary"
        >
          + Добавить клиента
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {clients.length === 0 ? 'Пока нет ни одного клиента.' : 'Ничего не найдено.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="card p-4 hover:border-border"
            >
              <p className="font-medium text-fg">{client.name}</p>
              {client.contact_person && (
                <p className="mt-1 text-sm text-muted">{client.contact_person}</p>
              )}
              {client.country && <p className="mt-1 text-xs text-muted">{client.country}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
