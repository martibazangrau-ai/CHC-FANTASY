import { isAuthError } from '@supabase/supabase-js';

import { strings } from '@/i18n';

const byCode: Record<string, string> = {
  invalid_credentials: strings.errors.invalidCredentials,
  email_not_confirmed: strings.errors.emailNotConfirmed,
  user_already_exists: strings.errors.userAlreadyExists,
  email_exists: strings.errors.userAlreadyExists,
  weak_password: strings.errors.weakPassword,
  email_address_invalid: strings.errors.invalidEmail,
  validation_failed: strings.errors.invalidEmail,
  over_request_rate_limit: strings.errors.rateLimit,
  over_email_send_rate_limit: strings.errors.rateLimit,
  signup_disabled: strings.errors.signupDisabled,
};

/** Traduce un error de Supabase Auth a un texto para el usuario. */
export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    if (error.code && byCode[error.code]) return byCode[error.code];
    // Sin respuesta del servidor: fallo de red.
    if (error.name === 'AuthRetryableFetchError') return strings.errors.network;
  }
  return strings.errors.generic;
}
