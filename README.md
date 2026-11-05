# The Last of O.S.

A multiplayer social-deduction game for VIT students, played in the browser. The O.S. is failing: **Citizens** keep it alive by completing tasks, **Attackers** sabotage it from inside, the **Authority** decides whose work counts, and the **Auditor** watches the Authority. One shared game, run live by an admin, for anywhere from 4 to 300 players.

**Live:** https://lastofos.vercel.app

- [How the game works](#how-the-game-works)
- [Who uses what](#who-uses-what)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [API reference](#api-reference)
- [Database](#database)
- [Testing](#testing)

---

## How the game works

### Flow

1. Players open the site, click **START GAME** and sign in with their VIT Google account (`@vitstudent.ac.in`). Google is the only sign-in option; there are no passwords or codes.
2. Everyone waits in the **lobby**, which shows who has joined.
3. An admin starts the game. Each player sees a role card for a few seconds, then lands on their role's map.
4. The game runs in rounds (default **4 rounds x 5 minutes**). The round advances automatically when its timer ends.
5. The game ends when **system health reaches 0** (Attackers win) or **the last round ends** (everyone else wins). Players then see the final standings with every role revealed.

Players move with **W A S D** or the **arrow keys** (an on-screen pad appears on phones) and walk into terminals: the **Task Bay** in the centre, **User Info** on the left and **Personal Stats** on the right.

### Roles

| Role | Share | Goal | What they do |
|---|---|---|---|
| Citizen | the rest (about 2:1 with attackers) | Keep the system alive | Play random minigames (aim, typing, visual memory, inventory, PID tuning). Each score becomes a certificate. |
| Attacker | the rest (about 1:2 with citizens) | Drain health to 0 | Play the same minigames, then choose an infection: none, minor (-6 score) or major (-10 score). |
| Authority | about 10% (min. 1) | Approve honest work, reject infected work | Judge pending certificates. They see the task, score and author, but not the infection. |
| Auditor | about 5% (min. 1) | Keep the Authority honest | See every player's role and every decision, including infected approvals. Can put a player on cooldown. |

### Scoring

When the Authority decides on a certificate, system health and the author's trust change:

| Decision | Health | Author's trust |
|---|---|---|
| Approve an honest certificate | +score/10 | +5 |
| Approve an infected certificate | -score/5 | +3 |
| Reject an honest certificate | -5 | -3 |
| Reject an infected certificate | +5 | -5 |

Health is clamped to 0-100. The final standings are sorted by trust.

### Timings

| Rule | Value |
|---|---|
| Buffer between a player's tasks | 5-15 s (random) |
| Auditor cooldown on an Authority | 3 min |
| Auditor cooldown on anyone else | 2 min |
| Auditor ability recharge | 6 min |
| Player session length | 12 h (renewed automatically while playing) |

All of these live in `CONFIG` in `frontend/api/_lib/game.ts`.

## Who uses what

| Person | Pages |
|---|---|
| Everyone | `/` home, `/game` sign-in, `/lobby` waiting room, `/how-to-play`, `/results` |
| Citizen | `/play` map, the five minigames, `/user-info`, `/personal-stats` |
| Attacker | `/attacker/play` map, attacker versions of the minigames (with the infection choice), stats pages |
| Authority | `/authority/play` map, `/authority/game` Sigil Warehouse, stats pages |
| Auditor | `/auditor/play` map, `/auditor/game` records and cooldowns, `/auditor/user-info` |
| Admin | `/admin` dashboard, `/admin/screen` big screen for a projector |

Every in-game page is guarded: it sends players to the lobby before the game starts, to their own role's map if they open another role's page, and to results when the game ends. Refreshing or reconnecting resumes the same game.

### Admin dashboard (`/admin`)

Available to the emails listed in `ADMIN_EMAILS`. It refreshes every 3 seconds.

- **Game control:** new game, start (needs 4+ players) or force start, next round, end game.
- **Live tuning:** announcement banner shown to every player, set system health, change the number of rounds and minutes per round (0 = manual rounds).
- **Players:** filter, change a player's role, apply or clear a cooldown, kick.
- **Insight:** role split, certificate counts and averages, activity log, recent games.
- **Export:** results CSV for any game.

### Big screen (`/admin/screen`)

For projecting at an event. It shows the join link, the lobby roster, then the live health bar, round timer, most-trusted players and certificate flow, and finally the winner. It never shows a role while the game is live.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, React Router 6, TypeScript, Vite 7, Tailwind CSS 3 (pixel-art theme: Press Start 2P, Tiny5, Jura) |
| Backend | Express 5 running as a single Vercel serverless function (`frontend/api/index.ts`) |
| Database | Turso (libSQL / SQLite) |
| Login | Clerk with Google sign-in, exchanged for the game's own 12-hour session token (JWT, `jose`) |
| Hosting | Vercel, deployed through its GitHub integration |
| CI | GitHub Actions: typecheck, API tests and build on every push; database migrations on schema changes |

Everything runs on free tiers.

## Project structure

```
.
├── .github/workflows/
│   ├── ci.yml              # typecheck, API tests, build
│   └── migrate.yml         # applies db/schema.sql to Turso
├── frontend/               # the whole app (Vercel root directory)
│   ├── api/                # serverless API
│   │   ├── index.ts        # Vercel entry: exports the Express app
│   │   ├── _app.ts         # Express app and route mounting
│   │   ├── _lib/
│   │   │   ├── auth.ts     # session tokens, requireAuth / requireAdmin, VIT email rules
│   │   │   ├── clerk.ts    # verifies Clerk tokens, reads the verified email
│   │   │   ├── db.ts       # Turso client (lazy)
│   │   │   └── game.ts     # rules, role assignment, round timer, game lifecycle
│   │   └── _routes/        # auth, lobby, session, minigame, authority, auditor, admin
│   ├── client/             # React app
│   │   ├── App.tsx         # routes (lazy-loaded)
│   │   ├── pages/          # screens; attacker/, authority/, auditor/ hold role-specific ones
│   │   ├── components/     # characters, HealthBar, GameBanner, MapControls, pixel UI kit
│   │   ├── hooks/          # use-game-state (polling), use-game-guard (routing by status/role)
│   │   └── lib/            # api.ts (API client), auth.ts (session handling)
│   ├── db/schema.sql       # database schema
│   ├── scripts/
│   │   ├── migrate.ts      # pnpm db:migrate
│   │   └── smoke.ts        # pnpm test:api, end-to-end API tests
│   ├── public/             # maps, sprites, backgrounds
│   ├── DEPLOY.md           # step-by-step deployment and event guide
│   └── vercel.json         # build output and rewrites
└── server/                 # earlier backend, kept for reference
```

## Running locally

Requirements: Node.js 22+ and pnpm 10.

```bash
cd frontend
pnpm install
cp .env.example .env.local     # fill in the values (see below)
pnpm db:migrate                # create the tables
pnpm dev                       # http://localhost:8080
```

The Vite dev server also serves the API on the same port. For a throwaway local database, set `TURSO_DATABASE_URL=file:local.db` and leave the token empty. The sign-in box needs real Clerk keys (development keys are free).

| Command | What it does |
|---|---|
| `pnpm dev` | App and API with hot reload |
| `pnpm build` | Production build into `dist/spa` |
| `pnpm typecheck` | TypeScript check |
| `pnpm db:migrate` | Apply `db/schema.sql` (safe to re-run) |
| `pnpm test:api` | End-to-end API tests (use a local database) |

To make yourself an admin locally, put your email in `ADMIN_EMAILS`.

## Environment variables

Set these in `frontend/.env.local` locally and in Vercel (Project > Settings > Environment Variables) for production. `.env` and `.env.local` are git-ignored.

| Variable | Used by | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | API, migrations | `libsql://...turso.io`, or `file:local.db` locally |
| `TURSO_AUTH_TOKEN` | API, migrations | Turso database token |
| `VITE_CLERK_PUBLISHABLE_KEY` | browser | Clerk publishable key (`pk_...`); baked in at build time |
| `CLERK_SECRET_KEY` | API | Clerk secret key (`sk_...`); never expose to the browser |
| `SESSION_SECRET` | API | Signs game sessions; `openssl rand -base64 32`. Changing it signs everyone out. |
| `ADMIN_EMAILS` | API | Comma-separated emails that can use `/admin` |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | tooling only | Optional, for inspecting deployments from the CLI; the app does not read them |

GitHub Actions needs only `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as repository secrets (for the migrate workflow).

## Deployment

The full walkthrough is in [`frontend/DEPLOY.md`](frontend/DEPLOY.md). In short:

1. Vercel project linked to this repo with **Root Directory `frontend`**. Every push to `main` deploys.
2. The environment variables above set in Vercel.
3. Clerk: **Google** as the only sign-in option (email verification code and password off).
4. `pnpm db:migrate` once against Turso. Afterwards the `Database migrate` workflow re-applies the schema whenever `frontend/db/` changes, or on demand from the Actions tab.

## API reference

All endpoints are under `/api` and return JSON. Except for sign-in, they need `Authorization: Bearer <session token>`.

**Auth**

| Method | Path | Description |
|---|---|---|
| POST | `/auth/clerk` | `{ token }` Clerk session token, exchanged for a game session. Returns 403 for non-VIT emails. |
| POST | `/auth/refresh` | New session token while the current one is valid |
| POST | `/auth/verify` | Check a session token |

**Lobby**

| Method | Path | Description |
|---|---|---|
| GET | `/lobby` | The open game and whether you are in it |
| POST | `/lobby/join` | Join the open game, or open a new lobby if none exists |

**Game** (`:id` is the session id)

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/session/:id/state` | player | Health, round, timer, status, your role and cooldowns, announcement |
| GET | `/session/:id/leaderboard` | player | Names and trust. Roles only for the auditor, admins, or after the game. |
| GET | `/session/:id/minigame` | citizen, attacker | Assign a random task |
| POST | `/session/:id/minigame/submit` | citizen, attacker | `{ problemId, answer, infectionLevel? }` submit a score as a certificate |
| GET | `/session/:id/certificates/pending` | authority | Pending certificates |
| POST | `/session/:id/certificates/:certId/process` | authority | `{ action: "approve" \| "reject" }` |
| GET | `/session/:id/ledger` | player | Decisions. The auditor sees all with infection flags; others see only their own, flags hidden. |
| POST | `/session/:id/cooldown` | auditor | `{ targetPlayerId, reason? }` |

**Admin** (requires an email in `ADMIN_EMAILS`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/overview` | Everything the dashboard shows |
| POST | `/admin/session/new` | `{ totalRounds?, roundMinutes? }` close any open game and open a new lobby |
| POST | `/admin/session/start` | `{ force? }` assign roles and start |
| POST | `/admin/session/next-round` | Advance the round |
| POST | `/admin/session/end` | `{ winner?: "citizen" \| "attacker" }` |
| POST | `/admin/session/health` | `{ value }` |
| POST | `/admin/session/announce` | `{ message }` (empty string clears it) |
| POST | `/admin/session/config` | `{ totalRounds?, roundMinutes? }` |
| POST | `/admin/player/:pid` | `{ role?, cooldownSeconds?, trustScore? }` |
| DELETE | `/admin/player/:pid` | Remove a player from the game |
| GET | `/admin/results.csv?session=<id>` | Standings as CSV |

## Database

Defined in `frontend/db/schema.sql`. Timestamps are milliseconds since epoch.

| Table | Holds |
|---|---|
| `users` | One row per student: id (derived from email), email, display name |
| `sessions` | Games: status (`waiting` / `active` / `completed`), round, timer, health, winner, announcement |
| `players` | A user in a game: role, trust, cooldowns, next-task time |
| `certificates` | Submitted task scores with infection level and decision status |
| `ledger` | Every authority decision with its health change |
| `events` | Audit trail: starts, rounds, cooldowns, admin actions |

The round timer has no background job. The server advances rounds and ends games lazily, whenever someone reads the game state, which suits serverless hosting.

## Testing

```bash
cd frontend
TURSO_DATABASE_URL=file:local.db SESSION_SECRET=test-secret pnpm db:migrate
TURSO_DATABASE_URL=file:local.db SESSION_SECRET=test-secret pnpm test:api
```

`scripts/smoke.ts` runs about 40 checks against a real local database, covering:
- login rules
- the lobby
- role assignment
- task gating
- infection penalties
- authority scoring
- ledger and role privacy
- auditor cooldowns
- announcements
- the round timer
- win conditions
- the CSV export

CI runs these tests on every push.
