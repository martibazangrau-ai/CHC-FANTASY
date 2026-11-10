@AGENTS.md

# Fantasy Balonmano (CHC Fantasy) — contexto para Claude Code

## Qué es
App móvil (iOS y Android) de fantasy para un equipo de balonmano real.
- Cada usuario ("mánager") tiene monedas del juego y compra jugadores reales del equipo para formar su alineación.
- Después de cada partido, los entrenadores ponen una nota a cada jugador que ha jugado.
- Las notas se convierten en puntos, y cada mánager suma los puntos de los jugadores de su alineación en esa jornada.

## Roles
Solo juega la gente del propio equipo: los mánagers son los jugadores reales. Es una sola app con pantallas distintas según el rol.
- **Mánager** (`manager`): jugador del equipo. Puja por jugadores, vende, fija su alineación, ve clasificaciones. Puede ficharse a sí mismo.
- **Entrenador** (`coach`): crea partidos, pone notas y cierra el partido. No tiene equipo de fantasy.
- **Admin** (`admin`): gestiona la plantilla real, precios, temporadas, rondas de mercado y roles. Puede jugar como mánager; no pone notas.

## Stack
- **App**: Expo (React Native) + TypeScript (strict) + Expo Router (rutas en `src/app/`, ver AGENTS.md).
- **Backend**: Supabase (Postgres, Auth, Row Level Security, funciones SQL/RPC, Edge Functions si hace falta).
- **Builds**: EAS Build (iOS se compila en la nube; el desarrollo es en Windows, no hay Mac).
- **Pruebas en dispositivo**: Expo Go en móvil físico (iPhone y Android).

## Entorno de desarrollo
- Windows + VS Code + PowerShell 7. Los comandos que des deben funcionar en PowerShell.
- No hay Mac: no se puede usar `npx expo run:ios`. Mientras se pueda, mantener la app compatible con **Expo Go**. Antes de añadir una librería con código nativo que no esté incluida en Expo Go, avisar y preguntar, porque obligaría a pasar a development builds con EAS.

## Reglas de arquitectura
- **El cliente nunca es fuente de verdad para monedas, compras ni puntos.** Toda operación que mueva monedas o calcule puntos va en una función de Postgres (RPC) o Edge Function, dentro de una transacción.
- RLS activado en todas las tablas. Solo entrenadores/admin pueden escribir notas; nadie puede editar su saldo directamente.
- Cambios de esquema siempre como migraciones en `supabase/migrations/` (nunca editar a mano en el panel sin generar la migración).
- Tipos de la base de datos generados en `src/types/database.ts`.
- Variables de entorno en `.env` (no se sube a git): `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Nunca usar la clave `service_role`/secret en la app.
- Paquetes de la app con `npx expo install`; herramientas de desarrollo (p. ej. el CLI `supabase`) con `npm install -D`.
- Textos de la interfaz en castellano (preparar para catalán más adelante: no hardcodear strings dispersos).

## Comandos
- `npx expo start` — servidor de desarrollo (escanear QR con Expo Go). Usar `--tunnel` si el móvil no está en la misma red.
- `npx supabase db push --remote` — aplicar migraciones al proyecto remoto (sin `--remote`, el CLI v3 apunta al stack local de Docker).
- `npx supabase gen types typescript --remote | Out-File -Encoding utf8NoBOM src/types/database.ts` — regenerar tipos (no usar `>` de PowerShell 5, que escribe UTF-16).
- `npx expo lint` y `npx tsc --noEmit` — ejecutar ambos antes de dar una tarea por terminada.

## Reglas del juego (decididas el 2026-11-10)
- **Notas**: 0–10 en pasos de 0,5, una sola nota global por jugador y partido. Si puntúan varios entrenadores, cuenta la media. Los mánagers solo ven la media.
- **Puntos**: puntos = nota media. Quien no juega suma 0.
- **Alineación**: 1 portero (puntúa una vez) + 6 de ataque + 6 de defensa. Un jugador de campo puede ir en ambos lados y entonces suma dos veces. Los porteros solo van de portero.
- **Mercado**: copias limitadas por jugador (configurable por liga). Las copias libres se adjudican en rondas de subasta a ciegas: puja mínima = precio actual, gana la más alta y en empate la más antigua. La venta es inmediata, al precio actual.
- **Precios**: todos los jugadores empiezan con el mismo precio (`seasons.default_player_price`, 10 por defecto; el alta va por la RPC `admin_add_player`). Después son variables. Al cerrar un partido, `delta = redondeo(media − nota de referencia) × paso`, acotado y con precio mínimo. Parámetros en `seasons`.
- **Bloqueo**: desde `lock_at` hasta que el entrenador cierra el partido no se puede pujar, vender ni cambiar la alineación. La alineación vigente se mantiene de una jornada a otra.
- **Jornada = partido** (tabla `matches`).
- **Ligas**: una sola liga por temporada (`is_default`); el esquema admite ligas privadas más adelante.
- Valores por defecto: 100 monedas, 8 copias por jugador, plantilla máxima de 10. Son columnas de `seasons`/`leagues`, se cambian sin migración.
- Las RPC devuelven errores como códigos (`MARKET_CLOSED`, `BID_BELOW_PRICE`…); la app los traduce.
