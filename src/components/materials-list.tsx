'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MATERIAL_TYPE_LABELS, type MaterialType } from '@/lib/material-types';

export type MaterialListItem = {
  id: string;
  name: string;
  type: MaterialType;
  tags: string[];
};

export function MaterialsList({ items }: { items: MaterialListItem[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [items, search]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или тегу"
          className="input-field sm:max-w-xs"
        />
        <Link
          href="/dashboard/materials/new"
          className="btn btn-primary"
        >
          + Добавить материал
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {items.length === 0 ? 'Пока нет ни одного материала.' : 'Ничего не найдено.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/materials/${item.id}`}
              className="card p-4 hover:border-border"
            >
              <p className="font-medium text-fg">{item.name}</p>
              <p className="mt-1 text-sm text-muted">{MATERIAL_TYPE_LABELS[item.type]}</p>
              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
