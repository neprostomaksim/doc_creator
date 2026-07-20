-- Шаблоны договоров: исходный .docx, разобранная структура блоков и список
-- размеченных полей подстановки.

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category text,
  source_file_path text not null,
  blocks jsonb not null default '[]'::jsonb,
  fields jsonb not null default '[]'::jsonb,
  doc_styles jsonb,
  created_at timestamptz not null default now()
);

alter table public.templates enable row level security;

create policy "templates_owner" on public.templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Приватный бакет templates создаётся вручную в панели Supabase (см. инструкцию).
create policy "templates_bucket_owner" on storage.objects
  for all
  using (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);
