import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CasesList, type CaseListItem } from '@/components/cases-list';

export default async function ContractsPage() {
  const supabase = await createClient();

  const { data: cases } = await supabase
    .from('cases')
    .select('id, title, status, created_at, client:clients(id, name), contract_versions(version_number, created_at)')
    .order('created_at', { ascending: false });

  const items: CaseListItem[] = (cases ?? []).map((c) => {
    const versions = (c.contract_versions ?? []) as { version_number: number; created_at: string }[];
    const lastModified = versions.reduce<string>(
      (max, v) => (v.created_at > max ? v.created_at : max),
      c.created_at,
    );
    const client = (Array.isArray(c.client) ? c.client[0] : c.client) as
      | { id: string; name: string }
      | null;
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      clientId: client?.id ?? '',
      clientName: client?.name ?? '—',
      versionCount: versions.length,
      lastModified,
    };
  });

  const clients = Array.from(
    new Map(items.map((i) => [i.clientId, i.clientName])).entries(),
  ).map(([id, name]) => ({ id, name }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Договоры</h1>
        <Link
          href="/dashboard/contracts/new"
          className="btn btn-primary"
        >
          + Создать договор
        </Link>
      </div>

      <CasesList items={items} clients={clients} />
    </div>
  );
}
