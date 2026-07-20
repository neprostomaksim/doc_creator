-- Баг в исходной redeem_invite_code (0001): она сначала проставляла
-- invite_codes.used_by = auth.uid(), а строка в profiles с этим id создавалась
-- только следующим шагом — но used_by ссылается на profiles(id), и такой
-- порядок всегда падал с ошибкой внешнего ключа. Правильный порядок: сначала
-- profiles, потом invite_codes.

create or replace function public.redeem_invite_code(p_code text, p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Не авторизован';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.profiles (id, email, full_name)
  values (v_uid, v_email, p_full_name)
  on conflict (id) do nothing;

  update public.invite_codes
  set is_used = true, used_by = v_uid
  where code = p_code and is_used = false;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Код приглашения недействителен или уже использован';
  end if;
end;
$$;

grant execute on function public.redeem_invite_code(text, text) to authenticated;
