'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  CASE_STATUS_BADGE,
  type CaseStatus,
} from '@/lib/case-status';

export type CaseListItem = {
  id: string;
  title: string;
  status: CaseStatus;
  clientId: string;
  clientName: string;
  versionCount: number;
  lastModified: string;
};

export function CasesList({
  items,
  clients,
}: {
  items: CaseListItem[];
  clients: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (query && !item.title.toLowerCase().includes(query)) return false;
      if (clientFilter && item.clientId !== clientFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, search, clientFilter, statusFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию"
          className="input-field flex-1"
        />
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">Все клиенты</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">Все статусы</option>
          {CASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CASE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {items.length === 0 ? 'Пока нет ни одного договора.' : 'Ничего не найдено.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/contracts/${item.id}`}
              className="flex items-center justify-between card p-4 hover:border-border"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{item.title}</p>
                <p className="truncate text-sm text-muted">
                  {item.clientName} · {item.versionCount}{' '}
                  {item.versionCount === 1 ? 'версия' : 'версии'} ·{' '}
                  {new Date(item.lastModified).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <span
                className={`ml-3 shrink-0 rounded-full px-2 py-1 text-xs font-medium ${CASE_STATUS_BADGE[item.status]}`}
              >
                {CASE_STATUS_LABELS[item.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
