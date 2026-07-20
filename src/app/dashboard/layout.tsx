import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SidebarNavLinks, BottomNavLinks } from '@/components/nav-links';
import { LogoutButton } from '@/components/logout-button';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    : { data: null };

  if (user && !profile) {
    redirect('/complete-registration');
  }

  const displayName = profile?.full_name ?? user?.email ?? '';

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white p-4 md:flex">
        <p className="mb-6 px-3 text-lg font-semibold text-gray-900">Договоры</p>
        <SidebarNavLinks />
        <div className="mt-auto flex items-center justify-between px-3 pt-4">
          <span className="truncate text-sm text-gray-700">{displayName}</span>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <p className="text-lg font-semibold text-gray-900">Договоры</p>
          <LogoutButton />
        </header>

        <main className="flex-1 px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white md:hidden">
          <BottomNavLinks />
        </nav>
      </div>
    </div>
  );
}
