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
        <h1 className="text-2xl font-semibold text-fg">Шаблоны</h1>
        <Link
          href="/dashboard/templates/new"
          className="btn btn-primary"
        >
          + Загрузить шаблон
        </Link>
      </div>

      {!templates || templates.length === 0 ? (
        <p className="text-sm text-muted">Пока нет ни одного шаблона.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/dashboard/templates/${template.id}`}
              className="card p-4 hover:border-border"
            >
              <p className="font-medium text-fg">{template.name}</p>
              {template.category && (
                <p className="mt-1 text-sm text-muted">{template.category}</p>
              )}
              <p className="mt-1 text-xs text-muted">
                {new Date(template.created_at).toLocaleDateString('ru-RU')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
