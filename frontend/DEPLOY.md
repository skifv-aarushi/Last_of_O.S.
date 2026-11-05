# Deploy guide: Vercel + Turso + Google sign-in + GitHub Actions

Everything here is on free tiers. Total time: about 30 minutes.

Architecture: the React app and the API (`frontend/api/`) deploy together to Vercel. Data lives in Turso (SQLite). Players sign in with Google, limited to `@vitstudent.ac.in`. GitHub Actions tests every push and deploys `main`.

---

## 0. Before you start

- **Revoke the leaked Firebase key.** `firebase/last-of-os-firebase-adminsdk-*.json` (a service-account private key) is in the git history. Go to Google Cloud Console > IAM & Admin > Service Accounts > `firebase-adminsdk-...` > Keys, and delete every key. Do this even though the project is no longer used.
- Install: Node 22+, `pnpm` (`npm i -g pnpm@10`), and the Turso CLI (https://docs.turso.tech/cli/installation).
- Accounts needed: GitHub, Vercel (sign up with GitHub), Turso, Google Cloud.

## 1. Create the Turso database

```bash
turso auth signup            # or: turso auth login
turso db create last-of-os
turso db show last-of-os --url          # -> TURSO_DATABASE_URL  (libsql://...)
turso db tokens create last-of-os       # -> TURSO_AUTH_TOKEN
```

Keep both values. If you created a database from an older version of this project, run `turso db destroy last-of-os` and create it again, because the tables changed.

## 2. Create the Google OAuth client

1. Go to https://console.cloud.google.com and create (or pick) a project.
2. **APIs & Services > OAuth consent screen**: choose *External*, fill in the app name and your email, and save. (Only add scopes `openid`, `email`, `profile`.) While it is in *Testing* mode only listed test users can sign in, so click **Publish app** before the event.
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**, type *Web application*.
4. **Authorized JavaScript origins** (no trailing slash, no path):
   - `http://localhost:8080`
   - `https://YOUR-PROJECT.vercel.app` (add after step 4; add your custom domain too if you have one)
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). You do not need the client secret.

The server only accepts verified `@vitstudent.ac.in` accounts, whatever the consent screen says.

## 3. Generate the session secret

```bash
openssl rand -base64 32
```

This is `SESSION_SECRET`. Changing it later signs everyone out.

## 4. Create the Vercel project

1. https://vercel.com/new > import the GitHub repo.
2. **Root Directory: `frontend`**. The framework preset should detect Vite; `vercel.json` already sets the build command and output folder.
3. Add these **Environment Variables** (Production, and Preview if you want previews):

   | Name | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | from step 1 |
   | `TURSO_AUTH_TOKEN` | from step 1 |
   | `GOOGLE_CLIENT_ID` | from step 2 |
   | `VITE_GOOGLE_CLIENT_ID` | same Client ID |
   | `SESSION_SECRET` | from step 3 |
   | `ADMIN_EMAILS` | comma-separated organiser emails, e.g. `you@vitstudent.ac.in` |

4. Click **Deploy**. Note your URL (`https://YOUR-PROJECT.vercel.app`) and add it to the Google origins from step 2.
5. Because GitHub Actions will do the deploys (step 6), go to **Settings > Git** and **Disconnect** the repository, otherwise every push deploys twice. (Or skip step 6 and keep the Vercel Git integration; then you must run the migration yourself, see step 5.)

## 5. Create the database tables

From your machine:

```bash
cd frontend
cp .env.example .env.local     # fill in the values from steps 1-3
pnpm install
pnpm db:migrate                # prints "Schema applied."
```

It is safe to run again; it only creates what is missing. The GitHub workflow runs it before every deploy.

## 6. Set up GitHub Actions auto-deploy

1. Get your Vercel IDs: in `frontend/` run `npx vercel link` (pick the project), then open `.vercel/project.json`. It holds `orgId` (= `VERCEL_ORG_ID`) and `projectId` (= `VERCEL_PROJECT_ID`).
2. Create a token: https://vercel.com/account/tokens > Create (= `VERCEL_TOKEN`).
3. In GitHub: **Settings > Secrets and variables > Actions**.
   - **Secrets**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - **Variables**: `VITE_GOOGLE_CLIENT_ID`
4. Push to `main`. Two workflows run:
   - `CI` (every push and PR): typecheck, API tests on a throwaway SQLite database, build.
   - `Deploy` (push to `main`): applies the schema to Turso, then builds and deploys to Vercel production.
5. Watch them under the repo's **Actions** tab. A red `Deploy` run almost always means a missing secret.

## 7. Check it works

1. Open your Vercel URL and click **START GAME**, then sign in with a `@vitstudent.ac.in` account. A non-VIT account should be rejected.
2. You land in the lobby. If your email is in `ADMIN_EMAILS` you see an **ADMIN** button; open `/admin`.
3. Test with 4+ accounts (or tick **Force start** with fewer): **Start game** assigns roles and moves everyone to their map.

If sign-in fails with `redirect_uri` / `origin_mismatch`, the exact site URL is missing from the Google authorized origins (step 2.4).

## 8. Custom domain (optional, free options)

- Vercel > Project > **Settings > Domains** > add a domain you own, then follow the DNS instructions.
- Free domains: the GitHub Student Developer Pack (a free `.me`/`.tech` for a year), or a free subdomain from `is-a.dev` / `js.org` (request via a pull request).
- Add the new domain to the Google authorized origins.

## 9. Running an event

1. Open `/admin` and click **New game** (or the first player to sign in creates a lobby automatically).
2. Players sign in at `/game` and wait in `/lobby`.
3. Click **Start game** (needs 4+ players, or **Force start** to test). Roles: about 10% authority, 5% auditor, the rest split citizens/attackers. Everyone is sent to their own map.
4. Rounds advance on a timer (default 4 rounds x 5 minutes; set minutes to 0 for manual **Next round**). The game ends when health reaches 0 (attackers win) or the last round ends (citizens win).
5. Players see standings on `/results`. Download the CSV from `/admin`.

Admin tools: announcement banner, set health, change roles, apply or clear cooldowns, kick players, tune rounds, activity log.

## Local development

```bash
cd frontend
cp .env.example .env.local     # use TURSO_DATABASE_URL=file:local.db for a local database
pnpm install
pnpm db:migrate
pnpm dev                       # http://localhost:8080 (API is served by the same dev server)
pnpm test:api                  # end-to-end API tests
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Deploy` fails at "Apply database schema" | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` secrets missing or wrong |
| `Deploy` fails at `vercel pull` | check `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; Root Directory must be `frontend` |
| Google popup says "origin_mismatch" | add the exact URL to authorized JavaScript origins |
| Everyone signed out suddenly | `SESSION_SECRET` was changed, or sessions (12 h) expired |
| `/admin` says "not an admin" | add the email to `ADMIN_EMAILS` in Vercel and redeploy |
| API returns 500 on a fresh database | run `pnpm db:migrate` against Turso (step 5) |
