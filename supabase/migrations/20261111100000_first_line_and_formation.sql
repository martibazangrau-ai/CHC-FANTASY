-- 1. Solo 3 copias de cada jugador.
-- 2. Lateral y central se unifican en "primera_linea".
-- 3. La alineación tiene formación: por lado, como máximo 2 extremos, 3 de primera línea
--    y 1 pivote. Un jugador de primera línea vale para cualquiera de los 3 puestos.

alter table public.leagues alter column max_copies_per_player set default 3;
update public.leagues set max_copies_per_player = 3;

-- Postgres no permite quitar valores de un enum: se crea el tipo nuevo y se migra la columna.
drop function public.admin_add_player(text, public.player_position, integer);

alter type public.player_position rename to player_position_old;
create type public.player_position as enum ('portero', 'extremo', 'primera_linea', 'pivote');

alter table public.players
  alter column "position" type public.player_position
  using (
    case when "position"::text in ('lateral', 'central') then 'primera_linea' else "position"::text end
  )::public.player_position;

drop type public.player_position_old;

create function public.admin_add_player(
  p_full_name text,
  p_position public.player_position,
  p_shirt_number integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
  v_player_id uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'NAME_REQUIRED';
  end if;

  select * into v_season from public.seasons where is_active;
  if not found then
    raise exception 'NO_ACTIVE_SEASON';
  end if;

  insert into public.players (full_name, "position", shirt_number)
  values (trim(p_full_name), p_position, p_shirt_number)
  returning id into v_player_id;

  insert into public.season_players (season_id, player_id, initial_price, current_price)
  values (v_season.id, v_player_id, v_season.default_player_price, v_season.default_player_price);

  return v_player_id;
end;
$$;

revoke execute on function public.admin_add_player(text, public.player_position, integer) from public, anon;
grant execute on function public.admin_add_player(text, public.player_position, integer) to authenticated;

-- Alineación con formación por posiciones.
create or replace function public.set_lineup(
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

  -- Formación de cada lado: sin porteros, máx. 2 extremos, 3 de primera línea y 1 pivote.
  if exists (
    select 1
    from (
      select 'attack' as side, unnest(v_attack) as player_id
      union all
      select 'defense', unnest(v_defense)
    ) s
    join public.players pl on pl.id = s.player_id
    group by s.side, pl."position"
    having count(*) > case pl."position"
      when 'extremo' then 2
      when 'primera_linea' then 3
      when 'pivote' then 1
      else 0
    end
  ) then
    raise exception 'INVALID_FORMATION';
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
