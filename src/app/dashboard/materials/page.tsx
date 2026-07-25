import { createClient } from '@/lib/supabase/server';
import { MaterialsList } from '@/components/materials-list';

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, type, tags')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-fg">Материалы</h1>
      <MaterialsList items={materials ?? []} />
    </div>
  );
}
