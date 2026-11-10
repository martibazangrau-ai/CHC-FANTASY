import { supabase } from '@/lib/supabase';

/** Equipo del usuario en la liga por defecto de la temporada activa, o null si aún no lo ha creado. */
export async function fetchMyTeam(userId: string) {
  return supabase
    .from('teams')
    .select('id, name, balance, league_id, leagues!inner(is_default, season_id)')
    .eq('user_id', userId)
    .eq('leagues.is_default', true)
    .maybeSingle();
}

export type MyTeam = NonNullable<Awaited<ReturnType<typeof fetchMyTeam>>['data']>;

/** Ronda de pujas abierta de una liga, si la hay. */
export async function fetchOpenRound(leagueId: string) {
  return supabase
    .from('market_rounds')
    .select('id, closes_at, status')
    .eq('league_id', leagueId)
    .eq('status', 'open')
    .maybeSingle();
}

/** Liga por defecto de la temporada activa. */
export async function fetchDefaultLeague() {
  return supabase
    .from('leagues')
    .select('id, name, season_id, seasons!inner(is_active, initial_budget)')
    .eq('is_default', true)
    .eq('seasons.is_active', true)
    .maybeSingle();
}

/** Todo lo que necesita la pantalla de mercado, en una sola tanda de consultas. */
export async function fetchMarket(team: MyTeam) {
  const leagueId = team.league_id;
  const [players, squads, round, league, freshTeam, marketOpen] = await Promise.all([
    supabase
      .from('players')
      .select('id, full_name, shirt_number, position, season_players(current_price)')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('squad_players')
      .select('player_id, team_id, purchase_price, teams!inner(league_id)')
      .eq('teams.league_id', leagueId),
    fetchOpenRound(leagueId),
    supabase
      .from('leagues')
      .select('max_copies_per_player, max_squad_size')
      .eq('id', leagueId)
      .single(),
    supabase.from('teams').select('balance').eq('id', team.id).single(),
    supabase.rpc('market_is_open', { p_season_id: team.leagues.season_id }),
  ]);

  const error =
    players.error ?? squads.error ?? round.error ?? league.error ?? freshTeam.error ?? marketOpen.error;
  if (error || !players.data || !squads.data || !league.data || !freshTeam.data) {
    return { error: error ?? { message: 'UNKNOWN' }, data: null } as const;
  }

  const bids = round.data
    ? await supabase
        .from('bids')
        .select('id, player_id, amount')
        .eq('team_id', team.id)
        .eq('round_id', round.data.id)
        .eq('status', 'pending')
    : null;
  if (bids?.error) return { error: bids.error, data: null } as const;

  const copiesTaken = new Map<string, number>();
  const mine = new Map<string, number>();
  for (const row of squads.data) {
    copiesTaken.set(row.player_id, (copiesTaken.get(row.player_id) ?? 0) + 1);
    if (row.team_id === team.id) mine.set(row.player_id, row.purchase_price);
  }
  const myBids = new Map((bids?.data ?? []).map((bid) => [bid.player_id, bid]));

  return {
    error: null,
    data: {
      balance: freshTeam.data.balance,
      maxCopies: league.data.max_copies_per_player,
      maxSquadSize: league.data.max_squad_size,
      marketOpen: marketOpen.data ?? false,
      round: round.data,
      roundExpired: !!round.data && new Date(round.data.closes_at).getTime() <= Date.now(),
      squadSize: mine.size,
      players: players.data.map((player) => ({
        id: player.id,
        fullName: player.full_name,
        shirtNumber: player.shirt_number,
        position: player.position,
        price: player.season_players[0]?.current_price ?? null,
        copiesFree: league.data.max_copies_per_player - (copiesTaken.get(player.id) ?? 0),
        purchasePrice: mine.get(player.id) ?? null,
        bid: myBids.get(player.id) ?? null,
      })),
    },
  } as const;
}

export type MarketData = NonNullable<Awaited<ReturnType<typeof fetchMarket>>['data']>;
export type MarketPlayer = MarketData['players'][number];

const dateFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** Fecha ISO dentro de N horas. */
export function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function formatDateTime(iso: string) {
  return dateFormat.format(new Date(iso));
}
