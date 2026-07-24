-- Библиотека материалов: программы обучения, описания услуг и т.п.,
-- которые ИИ учитывает при сборке договора с нуля (см. CLAUDE.md, шаг 5).
-- content_text — извлечённый или введённый вручную текст; file_path —
-- ссылка на исходный файл в Storage (если материал загружен файлом).

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null default 'other'
    check (type in ('program', 'service', 'appendix', 'other')),
  content_text text not null default '',
  file_path text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index materials_user_id_idx on public.materials (user_id);

alter table public.materials enable row level security;

create policy "materials_owner" on public.materials
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Приватный бакет materials создаётся вручную в панели Supabase (см. инструкцию).
create policy "materials_bucket_owner" on storage.objects
  for all
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
