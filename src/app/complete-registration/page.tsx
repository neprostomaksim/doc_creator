'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: redeemError } = await supabase.rpc('redeem_invite_code', {
      p_code: inviteCode.trim(),
      p_full_name: fullName.trim(),
    });

    if (redeemError) {
      setError('Код приглашения недействителен или уже использован');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card animate-in w-full max-w-sm p-6 shadow-[var(--shadow)]">
        <h1 className="mb-2 text-center text-2xl font-semibold text-fg">
          Завершите регистрацию
        </h1>
        <p className="mb-6 text-center text-sm text-muted">
          Ваш вход уже работает, но профиль ещё не создан — введите код приглашения ещё раз.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="label">
              Имя
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="inviteCode" className="label">
              Код приглашения
            </label>
            <input
              id="inviteCode"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <p className="rounded-lg px-3 py-2 text-sm text-[var(--danger)] bg-[var(--danger-soft)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Сохраняем…' : 'Завершить регистрацию'}
          </button>
        </form>
      </div>
    </main>
  );
}
