# Deploy guide

Stack: React app + API on **Vercel**, data in **Turso**, login through **Clerk** (Google sign-in, `@vitstudent.ac.in` only), **GitHub Actions** for tests and database migrations.

Repo: `github.com/avaramahmood/lastofos`. Vercel is linked to it, so **every push to `main` deploys automatically**.

## Where you are

Done: GitHub repo, Vercel project linked to it, Clerk app connected, Turso database and its credentials.

Still to do, in this order:

1. [Check the Vercel project settings](#1-check-the-vercel-project-settings)
2. [Set the Vercel environment variables](#2-set-the-vercel-environment-variables)
3. [Configure Clerk](#3-configure-clerk)
4. [Create the database tables](#4-create-the-database-tables)
5. [Add the GitHub secrets](#5-add-the-github-secrets)
6. [Redeploy and test](#6-redeploy-and-test)
7. [Before the event](#7-before-the-event)

---

## 1. Check the Vercel project settings

Vercel > your project > **Settings > General**:

- **Root Directory**: `frontend` (the app is not at the repo root).
- **Framework Preset**: Vite (auto-detected). Build command and output folder come from `frontend/vercel.json`, so leave the overrides empty.
- **Node.js Version**: 22.x.

If you change the Root Directory, trigger a redeploy afterwards.

## 2. Set the Vercel environment variables

Vercel > **Settings > Environment Variables**. Add each one for **Production** (and Preview if you want preview deployments to work):

| Name | Value | Notes |
|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://...turso.io` | `turso db show last-of-os --url` |
| `TURSO_AUTH_TOKEN` | token | `turso db tokens create last-of-os` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_...` | Clerk dashboard > API keys |
| `CLERK_SECRET_KEY` | `sk_...` | Clerk dashboard > API keys. Never prefix with `VITE_`. |
| `SESSION_SECRET` | random string | run `openssl rand -base64 32`. Changing it signs everyone out. |
| `ADMIN_EMAILS` | `you@vitstudent.ac.in` | comma-separated; these accounts can open `/admin` |

Important:
- If you connected Clerk through the Vercel Marketplace, it may have added variables with other names (for example `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`). **This app reads exactly `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.** Add them with these names if they are missing.
- `VITE_` variables are baked into the site at build time, so redeploy after changing `VITE_CLERK_PUBLISHABLE_KEY`.
- The publishable key and secret key must come from the **same** Clerk application and the same mode (both `test` or both `live`).

## 3. Configure Clerk

Clerk dashboard > your application:

1. **User & authentication > Social connections**: turn on **Google**. Leave every other provider off.
2. **User & authentication > Email, phone, username**
   - Keep **Email address** on (Google supplies it, already verified).
   - Under it, turn **off** "Sign-in with email" / **Email verification code**, so email is not a way to sign in.
   - Turn off **Password**, **Phone number** and **Username**.
3. Nothing to change for paths or domains with development keys. The sign-in box is embedded on `/game` of your own site.

Only verified `@vitstudent.ac.in` addresses can enter the game.

The game shows a single **Sign in with Google** button; Clerk handles the redirect to Google and back (`/sso-callback`).

Development vs production: `pk_test_`/`sk_test_` keys work and are free, and Google sign-in works out of the box with Clerk's shared Google credentials. A Clerk **Production** instance needs a domain you control (a `*.vercel.app` address does not qualify) and your own Google OAuth client ID and secret from Google Cloud Console. For a small event, development keys are fine.

## 4. Create the database tables

One-time, from your computer:

```bash
cd frontend
pnpm install
cp .env.example .env.local        # fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
pnpm db:migrate                   # prints "Schema applied."
```

Safe to run again; it only creates what is missing. After this, the `Database migrate` GitHub workflow re-applies the schema automatically whenever `frontend/db/` changes.

If your Turso database was created for an older version of this project, recreate it (`turso db destroy last-of-os`, then create it again), because the tables changed.

## 5. Add the GitHub secrets

GitHub repo > **Settings > Secrets and variables > Actions > New repository secret**. Add only these two:

| Secret | Value |
|---|---|
| `TURSO_DATABASE_URL` | same as in Vercel |
| `TURSO_AUTH_TOKEN` | same as in Vercel |

You do **not** need any Vercel secrets: Vercel deploys through its own GitHub integration.

What runs automatically:
- **CI** (every push and pull request): typecheck, API tests on a throwaway database, production build. No secrets needed.
- **Database migrate** (push to `main` that changes `frontend/db/`, or run it by hand from the Actions tab): applies the schema to Turso.

## 6. Redeploy and test

1. Push to `main` (or Vercel > Deployments > **Redeploy**). Watch the build in Vercel.
2. Open the site and click **START GAME**. You should see the **Sign in with Google** button.
3. Choose your `@vitstudent.ac.in` Google account. You land in the lobby.
4. Try a non-VIT address: it should end with "Only @vitstudent.ac.in email addresses can play."
5. Sign in with an address listed in `ADMIN_EMAILS`: an **ADMIN** button appears in the lobby, opening `/admin`.
6. With 4+ accounts (or **Force start** on the admin page), start a game and check each role lands on its own map.

## 7. Before the event

- Run a full rehearsal with a few real accounts.
- Decide on Clerk development vs production keys (step 3).
- Pick the round length and number of rounds on `/admin` (default 4 rounds x 5 minutes).
- Optional custom domain: Vercel > **Settings > Domains**. Free options: GitHub Student Developer Pack, or a free subdomain from `is-a.dev`. If you move Clerk to Production, this is the domain you give it.

### Running a game

Before players arrive, put `/admin/screen` (the **Big screen** button on `/admin`) on a projector. It shows the join link, the lobby roster, then the live health bar, round timer and most-trusted players, and finally the result. It never shows anyone's role while the game is running. Point first-timers at **How to Play** (home page, lobby, and the **?** button on every map).

1. `/admin` > **New game** (or the first player to sign in creates a lobby).
2. Players sign in at `/game` and wait in `/lobby`, which shows who else has joined. Phones work too: an on-screen pad appears on the maps.
3. **Start game** (needs 4+ players, or **Force start**). Roles are assigned: about 10% authority, 5% auditor, the rest split citizens and attackers.
4. Rounds advance on a timer (0 minutes = manual **Next round**). The game ends when system health hits 0 (attackers win) or the last round ends (citizens win).
5. Players see standings on `/results`; download the CSV from `/admin`.

## Local development

```bash
cd frontend
cp .env.example .env.local      # TURSO_DATABASE_URL=file:local.db works for a local database
pnpm install
pnpm db:migrate
pnpm dev                        # http://localhost:8080, API served by the same dev server
pnpm test:api                   # end-to-end API tests
```

You still need the Clerk keys in `.env.local` for sign-in to work.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Page says "Missing VITE_CLERK_PUBLISHABLE_KEY" | add it in Vercel (exact name) and redeploy |
| "Sign-in could not be verified" | `CLERK_SECRET_KEY` missing, or from a different Clerk app/mode than the publishable key |
| Google button does nothing or errors | make sure **Google** is enabled under Social connections, and the keys match the same Clerk app |
| Signed in with a non-VIT account | expected: it is rejected and signed out; retry with the VIT address |
| `/admin` says "not an admin" | add the email to `ADMIN_EMAILS` in Vercel, then redeploy |
| API returns 500 on a fresh database | run `pnpm db:migrate` against Turso (step 4) |
| Everyone signed out suddenly | `SESSION_SECRET` changed, or the 12-hour sessions expired |
| Vercel build fails | check Root Directory is `frontend` (step 1) and read the build log |
| Migrate workflow fails | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` GitHub secrets missing or wrong |
