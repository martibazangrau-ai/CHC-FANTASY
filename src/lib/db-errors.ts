import { strings } from '@/i18n';

// Códigos que lanzan las RPC de la base de datos (raise exception '<CODIGO>').
const byCode: Record<string, string> = {
  NOT_ALLOWED: strings.errors.notAllowed,
  NAME_REQUIRED: strings.errors.required,
};

/** Traduce un error de la base de datos a un texto para el usuario. */
export function dbErrorMessage(error: { message: string; code?: string }): string {
  // 42501 = permiso denegado por RLS o por permisos de tabla.
  if (error.code === '42501') return strings.errors.notAllowed;
  return byCode[error.message] ?? strings.errors.generic;
}
