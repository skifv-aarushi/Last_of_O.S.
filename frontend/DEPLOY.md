# Deploy guide: Vercel + Turso + email-code login + GitHub Actions

Everything here is on free tiers. Total time: about 30 minutes.

Architecture: the React app and the API (`frontend/api/`) deploy together to Vercel. Data lives in Turso (SQLite). Players sign in by entering their `@vitstudent.ac.in` address and typing the 6-digit code emailed to them (no Google or OAuth involved). GitHub Actions tests every push and deploys `main`.

---

## 0. Before you start

- **Revoke the leaked Firebase key.** `firebase/last-of-os-firebase-adminsdk-*.json` (a service-account private key) is in the git history. Go to Google Cloud Console > IAM & Admin > Service Accounts > `firebase-adminsdk-...` > Keys, and delete every key. Do this even though the project is no longer used.
- Install: Node 22+, `pnpm` (`npm i -g pnpm@10`), and the Turso CLI (https://docs.turso.tech/cli/installation).
- Accounts needed: GitHub, Vercel (sign up with GitHub), Turso, and Brevo (free email sending).

## 1. Create the Turso database

```bash
turso auth signup            # or: turso auth login
turso db create last-of-os
turso db show last-of-os --url          # -> TURSO_DATABASE_URL  (libsql://...)
turso db tokens create last-of-os       # -> TURSO_AUTH_TOKEN
```

Keep both values. If you created a database from an older version of this project, run `turso db destroy last-of-os` and create it again, because the tables changed.

## 2. Set up email sending (Brevo, free: 300 emails/day)

Login codes are sent over SMTP, so any SMTP provider works. Brevo needs no domain of your own.

1. Sign up at https://www.brevo.com (free plan).
2. **Senders, Domains & Dedicated IPs > Senders > Add a sender**: use an email you own and click the verification link Brevo sends. This is your `MAIL_FROM`.
3. **SMTP & API > SMTP**: note the **SMTP server** (`smtp-relay.brevo.com`), **port** (`587`) and **login** (looks like `abc123@smtp-brevo.com`), then click **Generate a new SMTP key**. The key is `SMTP_PASS`.

Notes:
- Each login uses one email, so the free plan covers about 300 sign-ins per day (sessions last 12 hours, so people do not log in again during an event).
- Mail from a free address (for example a gmail.com sender) can land in spam. If codes do not arrive, check Junk, or use a sender on a domain with Brevo's SPF/DKIM records set up (Senders, Domains > Domains > Authenticate).
- Other providers (Resend, Mailgun, SendGrid, Gmail SMTP with an app password) work by changing the four `SMTP_*` values.

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
   | `SMTP_HOST` | `smtp-relay.brevo.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | SMTP login from step 2 |
   | `SMTP_PASS` | SMTP key from step 2 |
   | `MAIL_FROM` | `The Last of O.S <your-verified-sender@example.com>` |
   | `SESSION_SECRET` | from step 3 |
   | `ADMIN_EMAILS` | comma-separated organiser emails, e.g. `you@vitstudent.ac.in` |

4. Click **Deploy**. Your site will be at `https://YOUR-PROJECT.vercel.app`.
5. Because GitHub Actions will do the deploys (step 6), go to **Settings > Git** and **Disconnect** the repository, otherwise every push deploys twice. (Or skip step 6 and keep the Vercel Git integration; then you must run the migration yourself, see step 5.)

## 5. Create the database tables

From your machine:

```bash
cd frontend
cp .env.example .env.local     # fill in the values from steps 1-3 (SMTP is optional locally)
pnpm install
pnpm db:migrate                # prints "Schema applied."
```

It is safe to run again; it only creates what is missing. The GitHub workflow runs it before every deploy.

## 6. Set up GitHub Actions auto-deploy

1. Get your Vercel IDs: in `frontend/` run `npx vercel link` (pick the project), then open `.vercel/project.json`. It holds `orgId` (= `VERCEL_ORG_ID`) and `projectId` (= `VERCEL_PROJECT_ID`).
2. Create a token: https://vercel.com/account/tokens > Create (= `VERCEL_TOKEN`).
3. In GitHub: **Settings > Secrets and variables > Actions**.
   - **Secrets**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - No repository variables are needed.
4. Push to `main`. Two workflows run:
   - `CI` (every push and PR): typecheck, API tests on a throwaway SQLite database, build.
   - `Deploy` (push to `main`): applies the schema to Turso, then builds and deploys to Vercel production.
5. Watch them under the repo's **Actions** tab. A red `Deploy` run almost always means a missing secret.

## 7. Check it works

1. Open your Vercel URL, click **START GAME**, enter a `@vitstudent.ac.in` address and click **Email me a code**. Type the code you receive. A non-VIT address should be rejected immediately.
2. You land in the lobby. If your email is in `ADMIN_EMAILS` you see an **ADMIN** button; open `/admin`.
3. Test with 4+ accounts (or tick **Force start** with fewer): **Start game** assigns roles and moves everyone to their map.

If the code email never arrives: check Junk, check the Vercel function logs for `request-code failed`, and confirm the four `SMTP_*` values and that `MAIL_FROM` is a verified sender.

## 8. Custom domain (optional, free options)

- Vercel > Project > **Settings > Domains** > add a domain you own, then follow the DNS instructions.
- Free domains: the GitHub Student Developer Pack (a free `.me`/`.tech` for a year), or a free subdomain from `is-a.dev` / `js.org` (request via a pull request).
- No other change is needed; the app uses relative URLs.

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
cp .env.example .env.local     # use TURSO_DATABASE_URL=file:local.db for a local database;
                               # with SMTP_HOST empty, login codes are printed in the terminal
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
| "Could not send the code" | wrong `SMTP_*` values, or `MAIL_FROM` is not a verified sender in Brevo |
| Code emails go to spam | authenticate a sending domain in Brevo, or ask players to check Junk |
| Everyone signed out suddenly | `SESSION_SECRET` was changed, or sessions (12 h) expired |
| `/admin` says "not an admin" | add the email to `ADMIN_EMAILS` in Vercel and redeploy |
| API returns 500 on a fresh database | run `pnpm db:migrate` against Turso (step 5) |
