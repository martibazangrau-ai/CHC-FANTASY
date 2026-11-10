-- Escala de monedas x10: los jugadores salen a 100 y el presupuesto pasa a 1000,
-- para mantener la proporción (da para 7–10 jugadores) con más margen en las pujas.
-- Todavía no hay equipos, partidos ni rondas, así que se pueden reescribir los precios.

alter table public.seasons
  alter column default_player_price set default 100,
  alter column initial_budget set default 1000,
  alter column price_step set default 5,
  alter column price_max_delta set default 20,
  alter column price_min set default 10;

update public.seasons
set default_player_price = 100,
    initial_budget = 1000,
    price_step = 5,
    price_max_delta = 20,
    price_min = 10;

update public.season_players
set initial_price = 100,
    current_price = 100;
