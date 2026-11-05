import { createClient, type Client } from "@libsql/client";

// Created on first use, not at import: the Vite dev server imports the API before it loads .env.local
let client: Client | null = null;
const getClient = () =>
  (client ??= createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  }));

export const db = new Proxy({} as Client, {
  get(_target, prop) {
    const c = getClient();
    const value = (c as any)[prop];
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
