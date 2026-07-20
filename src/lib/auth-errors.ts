const KNOWN_ERRORS: Record<string, string> = {
  'User already registered': 'Пользователь с такой почтой уже зарегистрирован',
  'Password should be at least 6 characters': 'Пароль должен быть не короче 6 символов',
  'Invalid login credentials': 'Неверная почта или пароль',
  'Unable to validate email address: invalid format': 'Некорректный формат почты',
  'Email not confirmed': 'Почта не подтверждена',
};

export function translateAuthError(message: string): string {
  return KNOWN_ERRORS[message] ?? 'Что-то пошло не так. Попробуйте ещё раз.';
}
