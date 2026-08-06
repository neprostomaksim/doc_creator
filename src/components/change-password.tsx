'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/password-field';
import { translateAuthError } from '@/lib/auth-errors';

/** Смена пароля для уже вошедшего пользователя (Настройки → Профиль). */
export function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(translateAuthError(updateError.message));
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PasswordField
        id="new-password"
        label="Новый пароль"
        value={password}
        onChange={setPassword}
        required
        minLength={6}
        autoComplete="new-password"
      />
      <PasswordField
        id="new-password-confirm"
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
      {success && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)' }}
        >
          Пароль обновлён.
        </p>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Сохраняем…' : 'Сменить пароль'}
      </button>
    </form>
  );
}
