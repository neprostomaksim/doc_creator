-- История переписки с ИИ внутри редактора конкретной версии договора.

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.contract_versions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_version_id_idx on public.chat_messages (version_id);

alter table public.chat_messages enable row level security;

-- Сообщение принадлежит пользователю опосредованно: version → case → user.
create function public.owns_version(p_version_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.contract_versions v
    join public.cases c on c.id = v.case_id
    where v.id = p_version_id
  );
$$;

create policy "chat_messages_owner" on public.chat_messages
  for all using (public.owns_version(version_id)) with check (public.owns_version(version_id));
