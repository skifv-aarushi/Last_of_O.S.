# Deploy: Vercel + Turso + Google sign-in + GitHub Actions

1. **Turso**: `turso auth login`, `turso db create last-of-os`, then `turso db show last-of-os --url` and `turso db tokens create last-of-os`.
2. **Google OAuth**: Cloud Console > APIs & Services > Credentials > OAuth client ID (Web). Add your Vercel/custom domain and `http://localhost:8080` under Authorized JavaScript origins. Set the consent screen to *Internal* only if you own a Workspace; otherwise leave External (the server enforces `@vitstudent.ac.in`).
3. **Vercel**: import the repo, set Root Directory to `frontend`, add env vars from `.env.example`.
4. **GitHub secrets**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`; repo variable `VITE_GOOGLE_CLIENT_ID`.
5. Set `ADMIN_EMAILS` (comma-separated) in Vercel; those accounts get the `/admin` dashboard and an ADMIN button in the lobby.
6. Local dev: copy `.env.example` to `.env.local`, run `pnpm db:migrate` then `pnpm dev`.

## Running an event

1. Admin opens `/admin` and clicks **New game** (or the first player to sign in creates a lobby automatically).
2. Players sign in at `/game` and wait in `/lobby`.
3. Admin clicks **Start game** (needs 4+ players, or **Force start** to test). Roles are assigned (about 10% authority, 5% auditor, the rest split citizens/attackers) and everyone is routed to their map.
4. Rounds advance on a timer (default 4 rounds x 5 min; 0 minutes = manual via **Next round**). The game ends when health hits 0 (attackers win) or the last round ends (citizens win).
5. After the game, players see standings on `/results`; the admin can download a CSV.

Admin tools: announcement banner, set health, change roles, apply/clear cooldowns, kick players, tune rounds, activity log.
