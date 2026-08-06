'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/password-field';
import { translateAuthError } from '@/lib/auth-errors';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

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
        setError('Ссылка устарела или недействительна. Запросите новое письмо восстановления.');
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

        {done ? (
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
                {error}{' '}
                <Link href="/forgot-password" className="font-medium underline">
                  Запросить снова
                </Link>
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Сохраняем…' : 'Сохранить пароль'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
