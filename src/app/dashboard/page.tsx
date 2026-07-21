import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DownloadButton } from '@/components/download-button';
import { CASE_STATUS_LABELS, CASE_STATUS_BADGE, type CaseStatus } from '@/lib/case-status';

export default async function DashboardPage() {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ count: casesCount }, { count: clientsCount }, { count: monthCount }] = await Promise.all([
    supabase.from('cases').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase
      .from('contract_versions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString()),
  ]);

  // Последние 5 версий с делом и клиентом.
  const { data: recentVersions } = await supabase
    .from('contract_versions')
    .select('id, docx_path, created_at, case:cases(id, title, client:clients(name))')
    .order('created_at', { ascending: false })
    .limit(5);

  const recent = await Promise.all(
    (recentVersions ?? []).map(async (v) => {
      const caseRow = (Array.isArray(v.case) ? v.case[0] : v.case) as
        | { id: string; title: string; client: { name: string } | { name: string }[] | null }
        | null;
      const client = caseRow
        ? ((Array.isArray(caseRow.client) ? caseRow.client[0] : caseRow.client) as {
            name: string;
          } | null)
        : null;
      let url: string | null = null;
      if (v.docx_path) {
        const { data } = await supabase.storage.from('contracts').createSignedUrl(v.docx_path, 3600);
        url = data?.signedUrl ?? null;
      }
      return {
        id: v.id,
        caseId: caseRow?.id ?? '',
        title: caseRow?.title ?? '—',
        clientName: client?.name ?? '—',
        createdAt: v.created_at,
        url,
      };
    }),
  );

  const { data: drafts } = await supabase
    .from('cases')
    .select('id, title, status, created_at, client:clients(name)')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(5);

  // Частые клиенты: топ-5 по числу дел.
  const { data: allCases } = await supabase.from('cases').select('client:clients(id, name)');
  const clientCounts = new Map<string, { name: string; count: number }>();
  for (const c of allCases ?? []) {
    const client = (Array.isArray(c.client) ? c.client[0] : c.client) as
      | { id: string; name: string }
      | null;
    if (!client) continue;
    const entry = clientCounts.get(client.id) ?? { name: client.name, count: 0 };
    entry.count += 1;
    clientCounts.set(client.id, entry);
  }
  const frequentClients = Array.from(clientCounts, ([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Дашборд</h1>
        <Link
          href="/dashboard/contracts/new"
          className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Создать договор
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Всего договоров', value: casesCount ?? 0 },
          { label: 'Клиентов', value: clientsCount ?? 0 },
          { label: 'Создано за месяц', value: monthCount ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-700">Последние договоры</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">Пока пусто.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3"
                >
                  <Link href={`/dashboard/contracts/${item.caseId}`} className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="truncate text-xs text-gray-500">
                      {item.clientName} · {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </Link>
                  {item.url && (
                    <DownloadButton
                      url={item.url}
                      filename={`${item.title}.docx`}
                      className="ml-3 shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      Скачать
                    </DownloadButton>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-700">Черновики</h2>
          {!drafts || drafts.length === 0 ? (
            <p className="text-sm text-gray-500">Нет черновиков.</p>
          ) : (
            <div className="space-y-2">
              {drafts.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/contracts/${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-300"
                >
                  <span className="min-w-0 truncate text-sm text-gray-900">{c.title}</span>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2 py-1 text-xs font-medium ${CASE_STATUS_BADGE[c.status as CaseStatus]}`}
                  >
                    {CASE_STATUS_LABELS[c.status as CaseStatus]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-700">Частые клиенты</h2>
          {frequentClients.length === 0 ? (
            <p className="text-sm text-gray-500">Пока пусто.</p>
          ) : (
            <div className="space-y-2">
              {frequentClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/contracts/new?client=${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-300"
                >
                  <span className="min-w-0 truncate text-sm text-gray-900">{c.name}</span>
                  <span className="ml-3 shrink-0 text-xs text-gray-500">
                    {c.count} {c.count === 1 ? 'дело' : 'дел'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
