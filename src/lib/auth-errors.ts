// Сопоставляем сообщения Supabase (англ.) с понятным русским текстом.
// Матчим по подстроке в нижнем регистре — точные строки Supabase меняет от
// версии к версии, а фрагменты стабильнее.
const RULES: { match: string; ru: string }[] = [
  { match: 'user already registered', ru: 'Пользователь с такой почтой уже зарегистрирован' },
  { match: 'invalid login credentials', ru: 'Неверная почта или пароль' },
  { match: 'email not confirmed', ru: 'Почта не подтверждена' },
  { match: 'invalid format', ru: 'Некорректный формат почты' },
  {
    match: 'different from the old password',
    ru: 'Новый пароль должен отличаться от старого',
  },
  { match: 'should be at least', ru: 'Пароль должен быть не короче 6 символов' },
  { match: 'password is known to be weak', ru: 'Пароль слишком простой — выберите надёжнее' },
  { match: 'pwned', ru: 'Этот пароль встречается в утечках — выберите другой' },
  {
    match: 'for security purposes',
    ru: 'Слишком часто. Подождите минуту и попробуйте ещё раз',
  },
  { match: 'rate limit', ru: 'Слишком много попыток. Подождите немного и повторите' },
  { match: 'over_email_send_rate', ru: 'Слишком часто. Подождите минуту и попробуйте ещё раз' },
  {
    match: 'session',
    ru: 'Сессия недействительна. Войдите заново или запросите новое письмо',
  },
  { match: 'auth session missing', ru: 'Сессия не найдена. Запросите новое письмо восстановления' },
];

export function translateAuthError(message: string): string {
  const lower = (message || '').toLowerCase();
  const hit = RULES.find((r) => lower.includes(r.match));
  return hit?.ru ?? 'Что-то пошло не так. Попробуйте ещё раз.';
}
