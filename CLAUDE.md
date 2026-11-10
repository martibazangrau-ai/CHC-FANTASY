@AGENTS.md

# Fantasy Balonmano (CHC Fantasy) — contexto para Claude Code

## Qué es
App móvil (iOS y Android) de fantasy para un equipo de balonmano real.
- Cada usuario ("mánager") tiene monedas del juego y compra jugadores reales del equipo para formar su alineación.
- Después de cada partido, los entrenadores ponen una nota a cada jugador que ha jugado.
- Las notas se convierten en puntos, y cada mánager suma los puntos de los jugadores de su alineación en esa jornada.

## Roles
- **Mánager**: cualquier usuario. Compra/vende jugadores, fija su alineación, ve clasificaciones.
- **Entrenador**: puede crear partidos/jornadas y poner notas a los jugadores que han jugado.
- **Admin**: gestiona la plantilla de jugadores reales, precios, temporadas y roles.
(Un mismo usuario puede ser jugador real del equipo y mánager a la vez.)

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
- `npx supabase db push` — aplicar migraciones al proyecto remoto.
- `npx supabase gen types typescript --linked > src/types/database.ts` — regenerar tipos.
- `npx expo lint` y `npx tsc --noEmit` — ejecutar ambos antes de dar una tarea por terminada.

## Decisiones pendientes (preguntar antes de asumir)
- Escala de notas (¿0–10? ¿con decimales?) y fórmula nota → puntos.
- Presupuesto inicial de monedas, precios de jugadores y si los precios varían según rendimiento.
- ¿Un jugador real puede estar en varias alineaciones a la vez o es exclusivo (mercado tipo subasta)?
- Tamaño y formación de la alineación (7 titulares + banquillo, ¿portero obligatorio?).
- ¿Qué pasa si varios entrenadores ponen nota al mismo jugador (media, uno solo)?
- Ligas: ¿una sola liga para todo el club o varias ligas privadas?
