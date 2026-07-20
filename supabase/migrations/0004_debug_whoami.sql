-- Временная диагностическая функция, удалим после отладки.
create function public.debug_whoami()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

grant execute on function public.debug_whoami() to authenticated;
