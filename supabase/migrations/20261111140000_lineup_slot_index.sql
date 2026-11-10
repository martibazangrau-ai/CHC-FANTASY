-- La alineación guarda el puesto concreto de cada jugador, para dibujarla sobre el campo.
-- Puestos de cada lado (slot_index): 1 extremo izq., 2 primera línea izq., 3 primera línea
-- centro, 4 primera línea dcha., 5 extremo dcho., 6 pivote. El portero usa el 0.

alter table public.lineup_slots add column slot_index smallint;

-- Reparte las alineaciones ya guardadas en los puestos de su posición.
with numbered as (
  select
    ls.team_id,
    ls.slot,
    ls.player_id,
    pl."position" as pos,
    row_number() over (partition by ls.team_id, ls.slot, pl."position" order by ls.player_id) as n
  from public.lineup_slots ls
  join public.players pl on pl.id = ls.player_id
)
update public.lineup_slots ls
set slot_index = case
  when n.slot = 'goalkeeper' then 0
  when n.pos = 'extremo' then (array[1, 5])[n.n]
  when n.pos = 'primera_linea' then (array[2, 3, 4])[n.n]
  when n.pos = 'pivote' and n.n = 1 then 6
end
from numbered n
where ls.team_id = n.team_id and ls.slot = n.slot and ls.player_id = n.player_id;

delete from public.lineup_slots where slot_index is null;

alter table public.lineup_slots
  alter column slot_index set not null,
  add constraint lineup_slots_index_range check (slot_index between 0 and 6),
  add constraint lineup_slots_unique_index unique (team_id, slot, slot_index);

-- p_attack y p_defense son arrays de hasta 6 elementos; la posición en el array es el
-- puesto (1..6) y null significa puesto vacío.
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
    raise exception 'INVALID_FORMATION';
  end if;

  -- count() ignora los null, así que los puestos vacíos no cuentan como duplicados.
  if (select count(x) <> count(distinct x) from unnest(v_attack) x)
    or (select count(x) <> count(distinct x) from unnest(v_defense) x)
  then
    raise exception 'DUPLICATE_PLAYER';
  end if;

  -- Todos deben estar en la plantilla del equipo.
  if exists (
    select 1
    from unnest(v_attack || v_defense || p_goalkeeper_id) x
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

  -- Cada puesto solo admite jugadores de su posición.
  if exists (
    select 1
    from (
      select player_id, idx from unnest(v_attack) with ordinality as a(player_id, idx)
      union all
      select player_id, idx from unnest(v_defense) with ordinality as d(player_id, idx)
    ) s
    join public.players pl on pl.id = s.player_id
    where pl."position" is distinct from (
      case
        when s.idx in (1, 5) then 'extremo'
        when s.idx in (2, 3, 4) then 'primera_linea'
        when s.idx = 6 then 'pivote'
      end
    )::public.player_position
  ) then
    raise exception 'INVALID_FORMATION';
  end if;

  delete from public.lineup_slots where team_id = p_team_id;

  if p_goalkeeper_id is not null then
    insert into public.lineup_slots (team_id, slot, player_id, slot_index)
    values (p_team_id, 'goalkeeper', p_goalkeeper_id, 0);
  end if;

  insert into public.lineup_slots (team_id, slot, player_id, slot_index)
  select p_team_id, 'attack', player_id, idx
  from unnest(v_attack) with ordinality as a(player_id, idx)
  where player_id is not null;

  insert into public.lineup_slots (team_id, slot, player_id, slot_index)
  select p_team_id, 'defense', player_id, idx
  from unnest(v_defense) with ordinality as d(player_id, idx)
  where player_id is not null;
end;
$$;
