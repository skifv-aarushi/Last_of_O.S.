import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

// .env.local wins over .env (dotenv never overrides values that are already set)
const root = fileURLToPath(new URL("..", import.meta.url));
config({ path: `${root}.env.local`, quiet: true });
config({ path: `${root}.env`, quiet: true });

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set. Put it in frontend/.env.local (see .env.example).");
  process.exit(1);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf-8");
await db.executeMultiple(schema);
console.log(`Schema applied to ${url.startsWith("file:") ? url : new URL(url.replace("libsql:", "https:")).host}.`);
