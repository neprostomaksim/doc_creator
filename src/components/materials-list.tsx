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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs focus:border-gray-500 focus:outline-none"
        />
        <Link
          href="/dashboard/materials/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
        >
          + Добавить материал
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">
          {items.length === 0 ? 'Пока нет ни одного материала.' : 'Ничего не найдено.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/materials/${item.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300"
            >
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="mt-1 text-sm text-gray-500">{MATERIAL_TYPE_LABELS[item.type]}</p>
              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
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
