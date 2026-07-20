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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs focus:border-gray-500 focus:outline-none"
        />
        <Link
          href="/dashboard/clients/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
        >
          + Добавить клиента
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">
          {clients.length === 0 ? 'Пока нет ни одного клиента.' : 'Ничего не найдено.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300"
            >
              <p className="font-medium text-gray-900">{client.name}</p>
              {client.contact_person && (
                <p className="mt-1 text-sm text-gray-500">{client.contact_person}</p>
              )}
              {client.country && <p className="mt-1 text-xs text-gray-400">{client.country}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
