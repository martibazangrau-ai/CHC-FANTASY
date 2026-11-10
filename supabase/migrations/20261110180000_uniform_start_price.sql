-- Todos los jugadores empiezan la temporada con el mismo precio; a partir de ahí
-- el precio (= puja mínima en la subasta) se mueve con el rendimiento en close_match.

alter table public.seasons
  add column default_player_price integer not null default 10 check (default_player_price >= 1);

-- Temporada y liga iniciales, para que la app funcione sin pantalla de alta de temporadas.
with new_season as (
  insert into public.seasons (name, is_active)
  select 'Temporada 2026-27', true
  where not exists (select 1 from public.seasons)
  returning id
)
insert into public.leagues (season_id, name, is_default)
select id, 'Liga CHC', true from new_season;

-- Alta de un jugador real: lo crea y lo inscribe en la temporada activa al precio común.
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

-- El alta va por la RPC, así que el cliente ya no inserta directamente.
revoke insert on public.players from authenticated;
revoke insert on public.season_players from authenticated;
