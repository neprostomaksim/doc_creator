'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/password-field';
import { translateAuthError } from '@/lib/auth-errors';

type Phase = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ссылка из письма приносит токен в URL (?code=… или #access_token=…).
  // Браузерный клиент Supabase сам разбирает его и ставит сессию — ждём этого.
  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const markReady = () => {
      if (settled) return;
      settled = true;
      setPhase('ready');
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) markReady();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    // Если за 6 секунд сессии так и нет — ссылка недействительна/протухла.
    const timer = setTimeout(() => {
      if (!settled) setPhase('invalid');
    }, 6000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      if (msg.includes('session') || msg.includes('jwt') || msg.includes('auth')) {
        setPhase('invalid');
      } else {
        setError(translateAuthError(updateError.message));
      }
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card animate-in w-full max-w-sm p-6 shadow-[var(--shadow)]">
        <h1 className="mb-6 text-center text-2xl font-semibold text-fg">Новый пароль</h1>

        {phase === 'checking' && (
          <p className="text-center text-sm text-muted">Проверяем ссылку…</p>
        )}

        {phase === 'invalid' && (
          <div className="space-y-4">
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
            >
              Ссылка недействительна или устарела. Ссылки на смену пароля одноразовые и живут
              недолго — запросите новое письмо.
            </p>
            <Link href="/forgot-password" className="btn btn-primary w-full">
              Запросить новое письмо
            </Link>
          </div>
        )}

        {phase === 'ready' &&
          (done ? (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)' }}
            >
              Пароль обновлён. Входим…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="password"
                label="Новый пароль"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirmPassword"
                label="Повтор пароля"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                minLength={6}
                autoComplete="new-password"
              />

              {error && (
                <p
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                >
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Сохраняем…' : 'Сохранить пароль'}
              </button>
            </form>
          ))}
      </div>
    </main>
  );
}
