-- Fantasy Balonmano (CHC Fantasy) — esquema inicial
--
-- Reglas del juego que implementa:
--   * Notas 0–10 en pasos de 0,5; varios entrenadores -> media; puntos = nota media.
--   * Alineación: 1 portero + 6 de ataque + 6 de defensa (un jugador puede repetir lado).
--   * Copias limitadas por liga; las copias libres se adjudican en subasta a ciegas.
--   * Precios variables: tras cada partido suben/bajan según la nota frente a una referencia.
--   * Los entrenadores solo ponen notas; no tienen equipo de fantasy.
--
-- El cliente nunca escribe monedas, plantillas, alineaciones ni puntos: todo va por RPC.
-- Las RPC lanzan excepciones con códigos (p. ej. 'MARKET_CLOSED') que la app traduce.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('manager', 'coach', 'admin');
create type public.player_position as enum ('portero', 'extremo', 'lateral', 'central', 'pivote');
create type public.match_status as enum ('scheduled', 'closed');
create type public.lineup_slot as enum ('goalkeeper', 'attack', 'defense');
create type public.transaction_type as enum ('initial', 'auction_win', 'sale', 'adjustment');
create type public.market_round_status as enum ('open', 'resolved');
create type public.bid_status as enum ('pending', 'won', 'lost');

-- ---------------------------------------------------------------------------
-- Usuarios y plantilla real
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  role public.user_role not null default 'manager',
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  shirt_number integer check (shirt_number between 0 and 99),
  "position" public.player_position not null,
  photo_url text,
  is_active boolean not null default true,
  -- Usuario de la app que corresponde a este jugador real (si tiene cuenta).
  profile_id uuid unique references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Temporadas y precios
-- ---------------------------------------------------------------------------
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default false,
  initial_budget integer not null default 100 check (initial_budget >= 0),
  -- Variación de precio tras cada partido:
  --   delta = redondeo(nota_media - price_ref_grade) * price_step, acotado a ±price_max_delta
  price_ref_grade numeric(3, 1) not null default 6 check (price_ref_grade between 0 and 10),
  price_step integer not null default 1 check (price_step >= 0),
  price_max_delta integer not null default 3 check (price_max_delta >= 0),
  price_min integer not null default 1 check (price_min >= 1),
  created_at timestamptz not null default now()
);

create unique index seasons_one_active on public.seasons (is_active) where is_active;

create table public.season_players (
  season_id uuid not null references public.seasons (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  initial_price integer not null check (initial_price >= 1),
  current_price integer not null check (current_price >= 1),
  primary key (season_id, player_id)
);

create index season_players_player_idx on public.season_players (player_id);

-- ---------------------------------------------------------------------------
-- Liga y equipos de fantasy
-- ---------------------------------------------------------------------------
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  name text not null,
  max_copies_per_player integer not null default 8 check (max_copies_per_player >= 1),
  max_squad_size integer not null default 10 check (max_squad_size >= 7),
  invite_code text unique,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index leagues_one_default_per_season on public.leagues (season_id) where is_default;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  balance integer not null check (balance >= 0),
  created_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create index teams_user_idx on public.teams (user_id);

create table public.squad_players (
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  purchase_price integer not null check (purchase_price >= 0),
  acquired_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create index squad_players_player_idx on public.squad_players (player_id);

-- Libro de movimientos de monedas: solo se insertan filas (desde las RPC).
create table public.transactions (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  type public.transaction_type not null,
  player_id uuid references public.players (id) on delete set null,
  amount integer not null,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index transactions_team_idx on public.transactions (team_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Partidos (jornada = partido) y notas
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  round_number integer not null check (round_number >= 1),
  opponent text not null,
  is_home boolean not null default true,
  played_at timestamptz not null,
  -- Desde lock_at hasta que se cierra el partido, mercado y alineaciones quedan congelados.
  lock_at timestamptz not null,
  status public.match_status not null default 'scheduled',
  closed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (season_id, round_number)
);

create table public.ratings (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  coach_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  grade numeric(3, 1) not null check (grade between 0 and 10 and grade * 2 = trunc(grade * 2)),
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id, coach_id)
);

create index ratings_player_idx on public.ratings (player_id);

-- Resultado por jugador, calculado al cerrar el partido.
create table public.player_match_scores (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  avg_grade numeric(4, 2) not null,
  points numeric(4, 2) not null,
  ratings_count integer not null,
  primary key (match_id, player_id)
);

create index player_match_scores_player_idx on public.player_match_scores (player_id);

create table public.price_history (
  id bigint generated always as identity primary key,
  season_id uuid not null references public.seasons (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null, -- null = ajuste manual del admin
  old_price integer not null,
  new_price integer not null,
  created_at timestamptz not null default now()
);

create index price_history_player_idx on public.price_history (season_id, player_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Mercado: rondas de subasta a ciegas
-- ---------------------------------------------------------------------------
create table public.market_rounds (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  status public.market_round_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create unique index market_rounds_one_open_per_league on public.market_rounds (league_id) where status = 'open';

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.market_rounds (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  amount integer not null check (amount >= 1),
  status public.bid_status not null default 'pending',
  placed_at timestamptz not null default now(), -- desempata: gana la puja más antigua
  unique (round_id, team_id, player_id)
);

create index bids_team_idx on public.bids (team_id);

-- ---------------------------------------------------------------------------
-- Alineaciones y puntos
-- ---------------------------------------------------------------------------
-- Alineación vigente de cada equipo. Queda congelada mientras hay un partido bloqueado;
-- al cerrar el partido se copia a team_match_lineup. Si el mánager no la toca, sigue valiendo.
create table public.lineup_slots (
  team_id uuid not null,
  slot public.lineup_slot not null,
  player_id uuid not null,
  primary key (team_id, slot, player_id),
  -- Al vender un jugador desaparece de la alineación.
  foreign key (team_id, player_id) references public.squad_players (team_id, player_id) on delete cascade
);

create table public.team_match_lineup (
  team_id uuid not null references public.teams (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  slot public.lineup_slot not null,
  player_id uuid not null references public.players (id) on delete cascade,
  points numeric(4, 2) not null default 0,
  primary key (team_id, match_id, slot, player_id)
);

create index team_match_lineup_match_idx on public.team_match_lineup (match_id);

create table public.team_match_points (
  team_id uuid not null references public.teams (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  points numeric(6, 2) not null default 0,
  primary key (team_id, match_id)
);

create index team_match_points_match_idx on public.team_match_points (match_id);

create view public.standings
with (security_invoker = true) as
select
  t.id as team_id,
  t.league_id,
  t.user_id,
  t.name as team_name,
  coalesce(sum(p.points), 0)::numeric(8, 2) as total_points,
  count(p.match_id)::integer as matches_scored
from public.teams t
left join public.team_match_points p on p.team_id = t.id
group by t.id;

-- ---------------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------------
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create function public.is_coach()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'coach', false);
$$;

create function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('coach', 'admin'), false);
$$;

-- Mercado y alineaciones abiertos = ningún partido de la temporada bloqueado y sin cerrar.
create function public.market_is_open(p_season_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.matches m
    where m.season_id = p_season_id
      and m.status = 'scheduled'
      and m.lock_at <= now()
  );
$$;

-- Crea el perfil al registrarse un usuario.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Mánager'
      ),
      40
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC: administración
-- ---------------------------------------------------------------------------
create function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;
end;
$$;

create function public.admin_set_price(p_season_id uuid, p_player_id uuid, p_price integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old integer;
begin
  if not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_price is null or p_price < 1 then
    raise exception 'INVALID_PRICE';
  end if;

  select current_price into v_old
  from public.season_players
  where season_id = p_season_id and player_id = p_player_id
  for update;

  if not found then
    raise exception 'PLAYER_NOT_IN_SEASON';
  end if;

  if v_old <> p_price then
    update public.season_players
    set current_price = p_price
    where season_id = p_season_id and player_id = p_player_id;

    insert into public.price_history (season_id, player_id, match_id, old_price, new_price)
    values (p_season_id, p_player_id, null, v_old, p_price);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: mánager
-- ---------------------------------------------------------------------------
-- Crea el equipo del usuario en la liga por defecto de la temporada activa.
create function public.join_league(p_team_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_league_id uuid;
  v_budget integer;
  v_team_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if public.is_coach() then
    raise exception 'COACHES_CANNOT_PLAY';
  end if;

  select l.id, s.initial_budget into v_league_id, v_budget
  from public.leagues l
  join public.seasons s on s.id = l.season_id
  where l.is_default and s.is_active;

  if v_league_id is null then
    raise exception 'NO_ACTIVE_LEAGUE';
  end if;

  if exists (select 1 from public.teams where league_id = v_league_id and user_id = v_uid) then
    raise exception 'ALREADY_IN_LEAGUE';
  end if;

  insert into public.teams (league_id, user_id, name, balance)
  values (v_league_id, v_uid, trim(p_team_name), v_budget)
  returning id into v_team_id;

  insert into public.transactions (team_id, type, amount, balance_after)
  values (v_team_id, 'initial', v_budget, v_budget);

  return v_team_id;
end;
$$;

-- Crea o actualiza la puja del usuario por un jugador en una ronda abierta.
create function public.place_bid(p_round_id uuid, p_player_id uuid, p_amount integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_round public.market_rounds%rowtype;
  v_season_id uuid;
  v_team public.teams%rowtype;
  v_price integer;
  v_bid_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_round from public.market_rounds where id = p_round_id;
  if not found then
    raise exception 'ROUND_NOT_FOUND';
  end if;
  if v_round.status <> 'open' or now() < v_round.opens_at or now() >= v_round.closes_at then
    raise exception 'ROUND_CLOSED';
  end if;

  select season_id into v_season_id from public.leagues where id = v_round.league_id;
  if not public.market_is_open(v_season_id) then
    raise exception 'MARKET_CLOSED';
  end if;

  select * into v_team
  from public.teams
  where league_id = v_round.league_id and user_id = v_uid;
  if not found then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  select sp.current_price into v_price
  from public.season_players sp
  join public.players p on p.id = sp.player_id
  where sp.season_id = v_season_id and sp.player_id = p_player_id and p.is_active;
  if not found then
    raise exception 'PLAYER_NOT_AVAILABLE';
  end if;

  if exists (select 1 from public.squad_players where team_id = v_team.id and player_id = p_player_id) then
    raise exception 'ALREADY_OWNED';
  end if;
  if p_amount is null or p_amount < v_price then
    raise exception 'BID_BELOW_PRICE';
  end if;
  if p_amount > v_team.balance then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  insert into public.bids (round_id, team_id, player_id, amount)
  values (p_round_id, v_team.id, p_player_id, p_amount)
  on conflict (round_id, team_id, player_id)
  do update set amount = excluded.amount, placed_at = now()
  returning id into v_bid_id;

  return v_bid_id;
end;
$$;

create function public.cancel_bid(p_bid_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.bids b
  using public.teams t, public.market_rounds r
  where b.id = p_bid_id
    and t.id = b.team_id
    and t.user_id = auth.uid()
    and r.id = b.round_id
    and r.status = 'open'
    and b.status = 'pending';

  if not found then
    raise exception 'BID_NOT_FOUND';
  end if;
end;
$$;

-- Resuelve una ronda: recorre las pujas de mayor a menor y adjudica mientras queden
-- copias libres, saldo y hueco en la plantilla. Cualquiera puede llamarla cuando la
-- ronda ha vencido (el resultado es determinista); el admin puede cerrarla antes.
create function public.resolve_market_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round public.market_rounds%rowtype;
  v_league public.leagues%rowtype;
  v_bid public.bids%rowtype;
  v_team public.teams%rowtype;
  v_copies integer;
  v_squad integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_round from public.market_rounds where id = p_round_id for update;
  if not found then
    raise exception 'ROUND_NOT_FOUND';
  end if;
  if v_round.status <> 'open' then
    raise exception 'ROUND_ALREADY_RESOLVED';
  end if;
  if v_round.closes_at > now() and not public.is_admin() then
    raise exception 'ROUND_STILL_OPEN';
  end if;

  select * into v_league from public.leagues where id = v_round.league_id for update;

  for v_bid in
    select *
    from public.bids
    where round_id = p_round_id and status = 'pending'
    order by amount desc, placed_at asc, id asc
  loop
    select * into v_team from public.teams where id = v_bid.team_id for update;

    select count(*) into v_copies
    from public.squad_players sq
    join public.teams t on t.id = sq.team_id
    where t.league_id = v_league.id and sq.player_id = v_bid.player_id;

    select count(*) into v_squad from public.squad_players where team_id = v_team.id;

    if v_copies < v_league.max_copies_per_player
      and v_squad < v_league.max_squad_size
      and v_team.balance >= v_bid.amount
      and not exists (
        select 1 from public.squad_players
        where team_id = v_team.id and player_id = v_bid.player_id
      )
    then
      insert into public.squad_players (team_id, player_id, purchase_price)
      values (v_team.id, v_bid.player_id, v_bid.amount);

      update public.teams set balance = balance - v_bid.amount where id = v_team.id;

      insert into public.transactions (team_id, type, player_id, amount, balance_after)
      values (v_team.id, 'auction_win', v_bid.player_id, -v_bid.amount, v_team.balance - v_bid.amount);

      update public.bids set status = 'won' where id = v_bid.id;
    else
      update public.bids set status = 'lost' where id = v_bid.id;
    end if;
  end loop;

  update public.market_rounds
  set status = 'resolved', resolved_at = now()
  where id = p_round_id;
end;
$$;

-- Vende un jugador al precio de mercado actual y libera su copia.
create function public.sell_player(p_team_id uuid, p_player_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team public.teams%rowtype;
  v_season_id uuid;
  v_price integer;
begin
  select * into v_team
  from public.teams
  where id = p_team_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  select season_id into v_season_id from public.leagues where id = v_team.league_id;
  if not public.market_is_open(v_season_id) then
    raise exception 'MARKET_CLOSED';
  end if;

  select current_price into v_price
  from public.season_players
  where season_id = v_season_id and player_id = p_player_id;
  if not found then
    raise exception 'PLAYER_NOT_AVAILABLE';
  end if;

  delete from public.squad_players where team_id = p_team_id and player_id = p_player_id;
  if not found then
    raise exception 'PLAYER_NOT_OWNED';
  end if;

  update public.teams set balance = balance + v_price where id = p_team_id;

  insert into public.transactions (team_id, type, player_id, amount, balance_after)
  values (p_team_id, 'sale', p_player_id, v_price, v_team.balance + v_price);

  return v_price;
end;
$$;

-- Sustituye la alineación vigente del equipo.
create function public.set_lineup(
  p_team_id uuid,
  p_goalkeeper_id uuid,
  p_attack uuid[],
  p_defense uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team public.teams%rowtype;
  v_season_id uuid;
  v_attack uuid[] := coalesce(p_attack, '{}');
  v_defense uuid[] := coalesce(p_defense, '{}');
  v_field uuid[];
begin
  select * into v_team
  from public.teams
  where id = p_team_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  select season_id into v_season_id from public.leagues where id = v_team.league_id;
  if not public.market_is_open(v_season_id) then
    raise exception 'LINEUP_LOCKED';
  end if;

  if cardinality(v_attack) > 6 or cardinality(v_defense) > 6 then
    raise exception 'TOO_MANY_PLAYERS';
  end if;
  if (select count(distinct x) from unnest(v_attack) x) <> cardinality(v_attack)
    or (select count(distinct x) from unnest(v_defense) x) <> cardinality(v_defense)
  then
    raise exception 'DUPLICATE_PLAYER';
  end if;

  v_field := array(select distinct x from unnest(v_attack || v_defense) x);

  -- Todos deben estar en la plantilla del equipo.
  if exists (
    select 1
    from unnest(v_field || p_goalkeeper_id) x
    where x is not null
      and not exists (
        select 1 from public.squad_players where team_id = p_team_id and player_id = x
      )
  ) then
    raise exception 'PLAYER_NOT_OWNED';
  end if;

  if p_goalkeeper_id is not null and not exists (
    select 1 from public.players pl where pl.id = p_goalkeeper_id and pl."position" = 'portero'
  ) then
    raise exception 'GOALKEEPER_REQUIRED';
  end if;

  if exists (
    select 1 from public.players pl where pl.id = any (v_field) and pl."position" = 'portero'
  ) then
    raise exception 'GOALKEEPER_IN_FIELD';
  end if;

  delete from public.lineup_slots where team_id = p_team_id;

  if p_goalkeeper_id is not null then
    insert into public.lineup_slots (team_id, slot, player_id)
    values (p_team_id, 'goalkeeper', p_goalkeeper_id);
  end if;

  insert into public.lineup_slots (team_id, slot, player_id)
  select p_team_id, 'attack', x from unnest(v_attack) x;

  insert into public.lineup_slots (team_id, slot, player_id)
  select p_team_id, 'defense', x from unnest(v_defense) x;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: cierre de partido (entrenador/admin)
-- ---------------------------------------------------------------------------
-- Calcula medias y puntos, congela las alineaciones, suma puntos por equipo y
-- actualiza precios. Todo en una transacción.
create function public.close_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches%rowtype;
  v_season public.seasons%rowtype;
begin
  if not public.is_staff() then
    raise exception 'NOT_ALLOWED';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_FOUND';
  end if;
  if v_match.status <> 'scheduled' then
    raise exception 'MATCH_ALREADY_CLOSED';
  end if;
  if v_match.lock_at > now() then
    raise exception 'MATCH_NOT_LOCKED';
  end if;

  select * into v_season from public.seasons where id = v_match.season_id;

  -- 1. Nota media y puntos por jugador (puntos = nota media).
  insert into public.player_match_scores (match_id, player_id, avg_grade, points, ratings_count)
  select p_match_id, r.player_id, round(avg(r.grade), 2), round(avg(r.grade), 2), count(*)
  from public.ratings r
  where r.match_id = p_match_id
  group by r.player_id;

  -- 2. Foto de las alineaciones vigentes con los puntos de cada puesto.
  insert into public.team_match_lineup (team_id, match_id, slot, player_id, points)
  select ls.team_id, p_match_id, ls.slot, ls.player_id, coalesce(s.points, 0)
  from public.lineup_slots ls
  join public.teams t on t.id = ls.team_id
  join public.leagues l on l.id = t.league_id
  left join public.player_match_scores s
    on s.match_id = p_match_id and s.player_id = ls.player_id
  where l.season_id = v_match.season_id;

  -- 3. Puntos por equipo (0 si no tenía alineación).
  insert into public.team_match_points (team_id, match_id, points)
  select t.id, p_match_id, coalesce(sum(tml.points), 0)
  from public.teams t
  join public.leagues l on l.id = t.league_id
  left join public.team_match_lineup tml
    on tml.team_id = t.id and tml.match_id = p_match_id
  where l.season_id = v_match.season_id
  group by t.id;

  -- 4. Variación de precios de quienes han jugado.
  with changes as (
    select
      sp.player_id,
      sp.current_price as old_price,
      greatest(
        v_season.price_min,
        sp.current_price + greatest(
          -v_season.price_max_delta,
          least(
            v_season.price_max_delta,
            round(s.avg_grade - v_season.price_ref_grade)::integer * v_season.price_step
          )
        )
      ) as new_price
    from public.season_players sp
    join public.player_match_scores s
      on s.match_id = p_match_id and s.player_id = sp.player_id
    where sp.season_id = v_match.season_id
  ),
  updated as (
    update public.season_players sp
    set current_price = c.new_price
    from changes c
    where sp.season_id = v_match.season_id
      and sp.player_id = c.player_id
      and c.new_price <> c.old_price
    returning sp.player_id
  )
  insert into public.price_history (season_id, player_id, match_id, old_price, new_price)
  select v_match.season_id, c.player_id, p_match_id, c.old_price, c.new_price
  from changes c
  where c.new_price <> c.old_price;

  update public.matches
  set status = 'closed', closed_at = now()
  where id = p_match_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.seasons enable row level security;
alter table public.season_players enable row level security;
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.squad_players enable row level security;
alter table public.transactions enable row level security;
alter table public.matches enable row level security;
alter table public.ratings enable row level security;
alter table public.player_match_scores enable row level security;
alter table public.price_history enable row level security;
alter table public.market_rounds enable row level security;
alter table public.bids enable row level security;
alter table public.lineup_slots enable row level security;
alter table public.team_match_lineup enable row level security;
alter table public.team_match_points enable row level security;

-- Lectura abierta a cualquier usuario autenticado.
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "players_select" on public.players for select to authenticated using (true);
create policy "seasons_select" on public.seasons for select to authenticated using (true);
create policy "season_players_select" on public.season_players for select to authenticated using (true);
create policy "leagues_select" on public.leagues for select to authenticated using (true);
create policy "teams_select" on public.teams for select to authenticated using (true);
create policy "squad_players_select" on public.squad_players for select to authenticated using (true);
create policy "matches_select" on public.matches for select to authenticated using (true);
create policy "player_match_scores_select" on public.player_match_scores for select to authenticated using (true);
create policy "price_history_select" on public.price_history for select to authenticated using (true);
create policy "market_rounds_select" on public.market_rounds for select to authenticated using (true);
create policy "team_match_lineup_select" on public.team_match_lineup for select to authenticated using (true);
create policy "team_match_points_select" on public.team_match_points for select to authenticated using (true);

-- Perfil: cada uno edita el suyo (solo display_name, por permisos de columna).
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Admin: plantilla real, temporadas, precios iniciales, ligas y rondas de mercado.
create policy "players_admin_insert" on public.players for insert to authenticated
  with check ((select public.is_admin()));
create policy "players_admin_update" on public.players for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "players_admin_delete" on public.players for delete to authenticated
  using ((select public.is_admin()));

create policy "seasons_admin_insert" on public.seasons for insert to authenticated
  with check ((select public.is_admin()));
create policy "seasons_admin_update" on public.seasons for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "season_players_admin_insert" on public.season_players for insert to authenticated
  with check ((select public.is_admin()));
create policy "season_players_admin_delete" on public.season_players for delete to authenticated
  using ((select public.is_admin()));

create policy "leagues_admin_insert" on public.leagues for insert to authenticated
  with check ((select public.is_admin()));
create policy "leagues_admin_update" on public.leagues for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "market_rounds_admin_insert" on public.market_rounds for insert to authenticated
  with check ((select public.is_admin()));
create policy "market_rounds_admin_update" on public.market_rounds for update to authenticated
  using ((select public.is_admin()) and status = 'open')
  with check ((select public.is_admin()));

-- Partidos: los crean y editan entrenadores/admin (el estado solo cambia con close_match).
create policy "matches_staff_insert" on public.matches for insert to authenticated
  with check ((select public.is_staff()));
create policy "matches_staff_update" on public.matches for update to authenticated
  using ((select public.is_staff()) and status = 'scheduled')
  with check ((select public.is_staff()));
create policy "matches_admin_delete" on public.matches for delete to authenticated
  using ((select public.is_admin()) and status = 'scheduled');

-- Notas: solo entrenadores, solo las suyas y solo mientras el partido no esté cerrado.
-- Los mánagers no ven notas individuales, solo la media en player_match_scores.
create policy "ratings_staff_select" on public.ratings for select to authenticated
  using ((select public.is_staff()));
create policy "ratings_coach_insert" on public.ratings for insert to authenticated
  with check (
    (select public.is_coach())
    and coach_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and m.status = 'scheduled')
  );
create policy "ratings_coach_update" on public.ratings for update to authenticated
  using (
    (select public.is_coach())
    and coach_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and m.status = 'scheduled')
  )
  with check (coach_id = (select auth.uid()));
create policy "ratings_coach_delete" on public.ratings for delete to authenticated
  using (
    (select public.is_coach())
    and coach_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and m.status = 'scheduled')
  );

-- Movimientos: cada mánager ve los de su equipo.
create policy "transactions_select_own" on public.transactions for select to authenticated
  using (
    exists (select 1 from public.teams t where t.id = team_id and t.user_id = (select auth.uid()))
  );

-- Pujas a ciegas: solo ves las tuyas hasta que la ronda se resuelve.
create policy "bids_select" on public.bids for select to authenticated
  using (
    exists (select 1 from public.teams t where t.id = team_id and t.user_id = (select auth.uid()))
    or exists (select 1 from public.market_rounds r where r.id = round_id and r.status = 'resolved')
  );

-- Alineación vigente: solo ves la tuya. Las de los demás se ven en team_match_lineup
-- cuando se cierra el partido.
create policy "lineup_slots_select_own" on public.lineup_slots for select to authenticated
  using (
    exists (select 1 from public.teams t where t.id = team_id and t.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on all tables in schema public to authenticated;

grant update (display_name) on public.profiles to authenticated;

grant insert, update, delete on public.players to authenticated;
grant insert, update on public.seasons to authenticated;
grant insert (season_id, player_id, initial_price, current_price), delete on public.season_players to authenticated;
grant insert, update on public.leagues to authenticated;
grant insert (league_id, opens_at, closes_at), update (opens_at, closes_at) on public.market_rounds to authenticated;

grant insert (season_id, round_number, opponent, is_home, played_at, lock_at) on public.matches to authenticated;
grant update (round_number, opponent, is_home, played_at, lock_at) on public.matches to authenticated;
grant delete on public.matches to authenticated;

grant insert (match_id, player_id, grade), update (grade, updated_at), delete on public.ratings to authenticated;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_coach() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.market_is_open(uuid) to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_price(uuid, uuid, integer) to authenticated;
grant execute on function public.join_league(text) to authenticated;
grant execute on function public.place_bid(uuid, uuid, integer) to authenticated;
grant execute on function public.cancel_bid(uuid) to authenticated;
grant execute on function public.resolve_market_round(uuid) to authenticated;
grant execute on function public.sell_player(uuid, uuid) to authenticated;
grant execute on function public.set_lineup(uuid, uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.close_match(uuid) to authenticated;
