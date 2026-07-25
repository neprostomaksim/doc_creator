-- Роль администратора, генерация кодов приглашения из UI и личные API-ключи.

-- 1. Флаг администратора в профиле.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Признак админа для текущего пользователя. SECURITY INVOKER: пользователь и так
-- вправе читать свою строку profiles (политика select_own_profile), поэтому
-- дополнительных прав не нужно.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- 2. Доступ администратора к таблице кодов приглашения (у неё раньше не было
--    ни одной policy — значит, писать в неё из приложения было нельзя вообще).
create policy "invite_codes_admin_all" on public.invite_codes
  for all using (public.is_admin()) with check (public.is_admin());

-- 3. Личные настройки пользователя, включая собственный ключ Gemini.
--    Ключ хранится в открытом виде, но строка защищена RLS: её видит только
--    владелец. Для закрытого сервиса это приемлемо; при выходе в публичный
--    SaaS ключи стоит шифровать (например, через Supabase Vault).
create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  gemini_api_key text,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_owner" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. Выдаём роль администратора. Поменяйте адрес, если аккаунт другой.
update public.profiles set is_admin = true where email = 'leonovmax126@gmail.com';
