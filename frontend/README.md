# The Last of O.S. (app)

This folder is the whole app: the React client (`client/`), the serverless API (`api/`), the database schema (`db/`) and scripts.

- Project overview, rules, API and setup: [../README.md](../README.md)
- Deployment and running an event: [DEPLOY.md](DEPLOY.md)

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```
