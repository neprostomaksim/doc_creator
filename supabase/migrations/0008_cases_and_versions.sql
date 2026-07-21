-- Дела (папки договоров с клиентом) и версии договоров внутри них.
-- Договор — это не файл, а дело, внутри которого живут версии v1, v2, v3
-- (см. CLAUDE.md 2.5). Старые версии никогда не перезаписываются.

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'signed', 'archived')),
  created_at timestamptz not null default now()
);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  version_number int not null,
  mode text not null default 'strict' check (mode in ('strict', 'assisted', 'generative')),
  template_id uuid references public.templates (id) on delete set null,
  blocks jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  docx_path text,
  created_at timestamptz not null default now(),
  unique (case_id, version_number)
);

create index cases_client_id_idx on public.cases (client_id);
create index contract_versions_case_id_idx on public.contract_versions (case_id);

alter table public.cases enable row level security;
alter table public.contract_versions enable row level security;

create policy "cases_owner" on public.cases
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Версия принадлежит пользователю опосредованно — через своё дело.
-- SECURITY INVOKER: вложенный select проходит через RLS cases, поэтому
-- чужие дела он не увидит.
create function public.owns_case(p_case_id uuid)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.cases where id = p_case_id);
$$;

create policy "contract_versions_owner" on public.contract_versions
  for all using (public.owns_case(case_id)) with check (public.owns_case(case_id));
