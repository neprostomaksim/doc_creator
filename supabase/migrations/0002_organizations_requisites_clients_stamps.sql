-- Своя организация, гибкие реквизиты (общие для организации и клиентов),
-- клиенты, подписи и печати.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null default '',
  country text,
  logo_path text,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  country text,
  contact_person text,
  notes text,
  created_at timestamptz not null default now()
);

-- owner_id ссылается либо на organizations.id, либо на clients.id — это
-- полигморфная связь, обычный foreign key тут невозможен. Владение
-- проверяется функцией is_requisites_owner (см. ниже) через RLS того стола,
-- на который указывает owner_id.
create table public.requisites (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('organization', 'client')),
  owner_id uuid not null,
  field_key text not null,
  field_label text not null,
  field_value text not null default '',
  sort_order int not null default 0
);

create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null check (type in ('signature', 'stamp')),
  file_path text not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.clients enable row level security;
alter table public.requisites enable row level security;
alter table public.stamps enable row level security;

create policy "organizations_owner" on public.organizations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "clients_owner" on public.clients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "stamps_owner" on public.stamps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- SECURITY INVOKER (по умолчанию): вложенные select идут от имени
-- вызывающего пользователя, поэтому RLS для organizations/clients уже сам
-- отфильтрует чужие строки — дублировать owner_id = auth.uid() тут не нужно.
create function public.is_requisites_owner(p_owner_type text, p_owner_id uuid)
returns boolean
language sql
stable
as $$
  select case p_owner_type
    when 'organization' then exists (select 1 from public.organizations where id = p_owner_id)
    when 'client' then exists (select 1 from public.clients where id = p_owner_id)
    else false
  end;
$$;

create policy "requisites_owner" on public.requisites
  for all
  using (public.is_requisites_owner(owner_type, owner_id))
  with check (public.is_requisites_owner(owner_type, owner_id));

-- Хранилище файлов: приватные бакеты stamps и logos создаются вручную
-- в панели Supabase (см. инструкцию). Политики ниже пускают пользователя
-- только в его собственную папку — путь файла должен начинаться с его
-- user id, например "11111111-.../signature.png".
create policy "stamps_bucket_owner" on storage.objects
  for all
  using (bucket_id = 'stamps' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'stamps' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos_bucket_owner" on storage.objects
  for all
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
