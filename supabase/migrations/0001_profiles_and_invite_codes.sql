-- Профили пользователей и коды приглашений.
-- Регистрация закрыта: создать профиль можно только вместе с валидным
-- неиспользованным кодом приглашения — см. функцию redeem_invite_code ниже.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table public.invite_codes (
  code text primary key,
  is_used boolean not null default false,
  used_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;

-- profiles: пользователь видит и редактирует только свою запись.
-- Вставка строки в profiles возможна только изнутри redeem_invite_code
-- (SECURITY DEFINER) — прямой INSERT для роли authenticated не разрешён,
-- иначе можно было бы завести профиль в обход проверки кода приглашения.
create policy "select_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "update_own_profile" on public.profiles
  for update using (auth.uid() = id);

-- invite_codes: нет ни одной policy — таблица недоступна напрямую
-- ни anon, ни authenticated. Единственный путь работы с ней — функции ниже.

-- Проверка кода на форме регистрации, до создания пользователя.
create function public.check_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.invite_codes
    where code = p_code and is_used = false
  );
end;
$$;

grant execute on function public.check_invite_code(text) to anon, authenticated;

-- Погашение кода и создание профиля сразу после auth.signUp().
-- Атомарно помечает код использованным (условие is_used = false в UPDATE
-- защищает от гонки, если два человека одновременно вводят один код).
create function public.redeem_invite_code(p_code text, p_full_name text)
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

  update public.invite_codes
  set is_used = true, used_by = v_uid
  where code = p_code and is_used = false;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Код приглашения недействителен или уже использован';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.profiles (id, email, full_name)
  values (v_uid, v_email, p_full_name);
end;
$$;

grant execute on function public.redeem_invite_code(text, text) to authenticated;
