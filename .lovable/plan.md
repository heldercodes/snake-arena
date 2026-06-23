# Snake game — plan

## Scope
Interactive Snake game with two modes (walls / pass-through), per-user accounts, per-mode leaderboards, a spectator page to watch live games, and a centralized service layer with a mock backend so the app runs with no real server. Vitest tests for game logic and the mock services.

## Visual direction
- Dark arcade-inspired theme (deep slate background, neon green snake, magenta food, subtle grid).
- Mono display font for the HUD/leaderboard, sans for UI.
- All colors as semantic tokens in `src/styles.css` (no ad-hoc classes).

## Routes (TanStack Start, file-based)
```
src/routes/
  __root.tsx              # shell + nav + auth provider
  index.tsx               # landing: pick mode / sign in
  auth.login.tsx          # login form
  auth.signup.tsx         # signup form
  play.$mode.tsx          # game canvas; mode = walls | wrap
  leaderboard.tsx         # top scores tabs per mode
  watch.index.tsx         # list active games
  watch.$gameId.tsx       # spectator view of one game
```

## Service layer
`src/services/` exposes a single `services` object with typed methods. Two implementations behind one interface:

- `types.ts` — `User`, `Score`, `LiveGame`, `GameMode`, plus the `Services` interface.
- `mock.ts` — in-memory implementation, seeds demo users, scores, and a couple of fake live games that auto-progress on a timer so the watch page feels alive. Persists to `localStorage` for the current user only.
- `index.ts` — picks implementation (mock by default; real backend pluggable later).

Methods:
```
auth: signup, login, logout, currentUser, onAuthChange
scores: submit(mode, score), top(mode, limit)
live: start(mode), tick(gameId, state), end(gameId, finalScore),
      list(), get(gameId), subscribe(gameId, cb)
```

Every component imports from `@/services` only — no direct backend calls anywhere else.

## Game engine
`src/game/engine.ts` — pure functions:
- `createState(mode, size)`
- `step(state, inputDir)` → next state (handles growth, collisions, wrap vs wall)
- `isGameOver(state)`

UI in `src/components/SnakeBoard.tsx` renders to `<canvas>`, drives the engine on a `setInterval`, reads input from arrow/WASD keys, and pushes `tick` to the live service every N frames so spectators see updates.

## Spectator
`watch.index.tsx` polls `services.live.list()` every 2s. `watch.$gameId.tsx` subscribes via the mock's pub/sub and renders the same `SnakeBoard` in read-only mode.

## Auth
Mock auth stores users in memory + localStorage. `__root.tsx` exposes user via context; `play` / `watch` redirect to `/auth/login` if signed out. No real passwords — mock just checks the stored hash-equivalent.

## Tests (Vitest)
- `engine.test.ts` — movement, growth on food, wall death, wrap-around, self-collision.
- `services.mock.test.ts` — signup/login round-trip, score submission ordering, live game lifecycle + subscribe callback.

## Out of scope
Real backend, real-time websockets, social login, mobile touch controls beyond basic swipe.
