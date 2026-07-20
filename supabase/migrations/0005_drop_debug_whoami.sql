-- Убираем временную диагностическую функцию из 0004.
drop function if exists public.debug_whoami();
