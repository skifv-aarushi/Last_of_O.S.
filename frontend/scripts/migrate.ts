import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf-8");
await db.executeMultiple(schema);
console.log("Schema applied.");
