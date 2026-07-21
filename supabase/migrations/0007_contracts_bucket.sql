-- Приватный бакет contracts создаётся вручную в панели Supabase (см. инструкцию).
create policy "contracts_bucket_owner" on storage.objects
  for all
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);
