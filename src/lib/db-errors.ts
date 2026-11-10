import { strings } from '@/i18n';

const e = strings.errors;

// Códigos que lanzan las RPC de la base de datos (raise exception '<CODIGO>').
const byCode: Record<string, string> = {
  NOT_ALLOWED: e.notAllowed,
  NOT_AUTHENTICATED: e.notAllowed,
  NAME_REQUIRED: e.required,
  COACHES_CANNOT_PLAY: e.coachesCannotPlay,
  NO_ACTIVE_LEAGUE: e.noActiveLeague,
  ALREADY_IN_LEAGUE: e.alreadyInLeague,
  ROUND_NOT_FOUND: e.notFound,
  ROUND_CLOSED: e.roundClosed,
  ROUND_ALREADY_RESOLVED: e.roundClosed,
  ROUND_STILL_OPEN: e.roundStillOpen,
  MARKET_CLOSED: e.marketClosed,
  TEAM_NOT_FOUND: e.notFound,
  BID_NOT_FOUND: e.notFound,
  PLAYER_NOT_AVAILABLE: e.playerNotAvailable,
  PLAYER_NOT_OWNED: e.notFound,
  ALREADY_OWNED: e.alreadyOwned,
  BID_BELOW_PRICE: e.bidBelowPrice,
  INSUFFICIENT_BALANCE: e.insufficientBalance,
  LINEUP_LOCKED: e.lineupLocked,
  INVALID_FORMATION: e.invalidFormation,
  GOALKEEPER_REQUIRED: e.invalidFormation,
  DUPLICATE_PLAYER: e.invalidFormation,
};

/** Traduce un error de la base de datos a un texto para el usuario. */
export function dbErrorMessage(error: { message: string; code?: string }): string {
  // 42501 = permiso denegado por RLS o por permisos de tabla.
  if (error.code === '42501') return e.notAllowed;
  // 23514 = restricción check; 23505 = duplicado.
  if (error.code === '23514' && error.message.includes('teams_name_check')) return e.teamNameInvalid;
  return byCode[error.message] ?? `${e.generic} (${error.code ?? error.message})`;
}
