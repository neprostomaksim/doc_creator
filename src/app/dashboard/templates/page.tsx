import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, category, created_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Шаблоны</h1>
        <Link
          href="/dashboard/templates/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Загрузить шаблон
        </Link>
      </div>

      {!templates || templates.length === 0 ? (
        <p className="text-sm text-gray-500">Пока нет ни одного шаблона.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/dashboard/templates/${template.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300"
            >
              <p className="font-medium text-gray-900">{template.name}</p>
              {template.category && (
                <p className="mt-1 text-sm text-gray-500">{template.category}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                {new Date(template.created_at).toLocaleDateString('ru-RU')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
