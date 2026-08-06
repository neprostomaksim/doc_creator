import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Обработчик ссылки из письма (восстановление пароля и т.п.).
 * Supabase может прислать либо PKCE-код (`code`), либо `token_hash` + `type`.
 * Здесь мы устанавливаем сессию и отправляем пользователя дальше (`next`).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') || '/reset-password';

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  const redirectTo = new URL(url.origin);
  redirectTo.pathname = ok ? next : '/forgot-password';
  if (!ok) redirectTo.searchParams.set('error', 'link');

  return NextResponse.redirect(redirectTo);
}
