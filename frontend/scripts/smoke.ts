import { createApi } from "../api/_app.ts";
import { signSession } from "../api/_lib/auth.ts";
import { db } from "../api/_lib/db.ts";
import { clerkImpl } from "../api/_lib/clerk.ts";

const srv = createApi().listen(0);
const base = `http://localhost:${(srv.address() as any).port}`;
const call = async (tok: string, m: string, p: string, b?: any) => {
  const r = await fetch(base + p, { method: m, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: b ? JSON.stringify(b) : undefined });
  return { s: r.status, j: await r.json().catch(() => ({})) } as any;
};
let fails = 0;
const ok = (name: string, cond: boolean, extra?: any) => { if (!cond) fails++; console.log(cond ? "PASS" : "FAIL", name, cond ? "" : JSON.stringify(extra)); };

// ---- Clerk login (token verification is stubbed; the real one calls Clerk) ----
clerkImpl.verify = async (token: string) => {
  if (!token.startsWith("clerk:")) throw new Error("bad token");
  const [, email, name] = token.split(":");
  return { email, name: name || "" };
};
const ex = (token: string) => call("", "POST", "/api/auth/clerk", { token });
ok("non-VIT email rejected", (await ex("clerk:someone@gmail.com")).s === 403);
ok("lookalike domain rejected", (await ex("clerk:x@vitstudent.ac.in.evil.com")).s === 403);
ok("invalid Clerk token rejected", (await ex("garbage")).s === 401);
const login = await ex("clerk:Test.User2024@vitstudent.ac.in:");
ok("VIT email logs in, name derived", login.s === 200 && login.j.user.displayName === "Test User" && !!login.j.token, login);
ok("Clerk name preferred when present", (await ex("clerk:a.b@vitstudent.ac.in:Real Name")).j.user.displayName === "Real Name");
ok("same email = same player id", (await ex("clerk:test.user2024@vitstudent.ac.in:")).j.user.uid === login.j.user.uid);
ok("session token works", (await call(login.j.token, "GET", "/api/lobby")).s === 200);
ok("no token = 401", (await call("", "GET", "/api/lobby")).s === 401);

const ids = ["u1", "u2", "u3", "u4", "u5", "u6"];
const T: Record<string, string> = {};
process.env.ADMIN_EMAILS = "adm@vitstudent.ac.in";
T.adm = await signSession("adm", "adm@vitstudent.ac.in");
for (const i of ids) T[i] = await signSession(i, `${i}@vitstudent.ac.in`);
// users must exist for the lobby display-name lookup
for (const i of ids) await db.execute({ sql: "INSERT INTO users (id,email,display_name,created_at) VALUES (?,?,?,?)", args: [i, `${i}@vitstudent.ac.in`, `Name ${i}`, Date.now()] });

ok("admin blocked for non-admin", (await call(T.u2, "GET", "/api/admin/overview")).s === 403);
for (const i of ids) { const r = await call(T[i], "POST", "/api/lobby/join"); if (i === "u1") var sid = r.j.sessionId; ok(`join ${i}`, r.s === 200 && r.j.sessionId === sid, r); }
ok("lobby shared by all", (await call(T.u3, "GET", "/api/lobby")).j.totalPlayers === 6);
ok("minigame refused before start", (await call(T.u2, "GET", `/api/session/${sid}/minigame`)).s === 400);
ok("start needs 4+", (await call(T.adm, "POST", "/api/admin/session/start")).s === 200);
const states: Record<string, any> = {};
for (const i of ids) states[i] = (await call(T[i], "GET", `/api/session/${sid}/state`)).j;
const byRole = (r: string) => ids.filter((i) => states[i].playerRole === r);
console.log("roles", Object.fromEntries(ids.map((i) => [i, states[i].playerRole])));
ok("one authority + one auditor", byRole("authority").length === 1 && byRole("auditor").length === 1);
ok("has attacker + citizen", byRole("attacker").length >= 1 && byRole("citizen").length >= 1);
ok("round 1 with timer", states.u1.currentRound === 1 && states.u1.roundEndsAt > Date.now());

const [auth, aud] = [byRole("authority")[0], byRole("auditor")[0]];
const atk = byRole("attacker")[0], cit = byRole("citizen").find((i) => i !== "u1") ?? byRole("citizen")[0];
ok("authority cannot run tasks", (await call(T[auth], "POST", `/api/session/${sid}/minigame/submit`, { problemId: "aim_1", answer: 50 })).s === 403);
ok("citizen cannot read pending", (await call(T[cit], "GET", `/api/session/${sid}/certificates/pending`)).s === 403);
ok("NaN answer rejected", (await call(T[cit], "POST", `/api/session/${sid}/minigame/submit`, { problemId: "aim_1", answer: "abc" })).s === 400);

const sub = await call(T[atk], "POST", `/api/session/${sid}/minigame/submit`, { problemId: "typing_atk_1", answer: 90, infectionLevel: "major" });
ok("attacker submit, major penalty applied", sub.j.score === 80, sub);
ok("replay of same problem rejected", (await call(T[atk], "POST", `/api/session/${sid}/minigame/submit`, { problemId: "typing_atk_1", answer: 90 })).s === 429);
await db.execute({ sql: "UPDATE players SET next_game_at = 0 WHERE session_id = ?", args: [sid] });
ok("duplicate problemId rejected", (await call(T[atk], "POST", `/api/session/${sid}/minigame/submit`, { problemId: "typing_atk_1", answer: 90 })).s === 409);
const csub = await call(T[cit], "POST", `/api/session/${sid}/minigame/submit`, { problemId: "aim_2", answer: 100, infectionLevel: "major" });
ok("citizen cannot infect (no penalty)", csub.j.score === 100, csub);

const pending = (await call(T[auth], "GET", `/api/session/${sid}/certificates/pending`)).j.certificates;
ok("authority sees 2 pending", pending.length === 2, pending);
const infected = pending.find((c: any) => c.score === 80), honest = pending.find((c: any) => c.score === 100);
const h0 = (await call(T[cit], "GET", `/api/session/${sid}/state`)).j.globalHealth;
const p1 = await call(T[auth], "POST", `/api/session/${sid}/certificates/${infected.id}/process`, { action: "approve" });
ok("approving infected hurts (-16)", p1.j.healthChange === -16, p1);
const p2 = await call(T[auth], "POST", `/api/session/${sid}/certificates/${honest.id}/process`, { action: "approve" });
ok("approving honest heals (+10)", p2.j.healthChange === 10, p2);
ok("health = 94", (await call(T[cit], "GET", `/api/session/${sid}/state`)).j.globalHealth === h0 - 16 + 10);
ok("double process rejected", (await call(T[auth], "POST", `/api/session/${sid}/certificates/${honest.id}/process`, { action: "reject" })).s === 400);

ok("citizen ledger hides infection", (await call(T[atk], "GET", `/api/session/${sid}/ledger`)).j.entries.every((e: any) => !e.wasInfected));
{ const al = (await call(T[auth], "GET", `/api/session/${sid}/ledger`)).j.entries;
  ok("authority sees own decisions, infection hidden", al.length === 2 && al.every((e: any) => !e.wasInfected), al); }
ok("auditor ledger shows infection", (await call(T[aud], "GET", `/api/session/${sid}/ledger`)).j.entries.some((e: any) => e.wasInfected));
const lb = (await call(T[cit], "GET", `/api/session/${sid}/leaderboard`)).j.leaderboard;
ok("roles hidden from citizen, names shown", lb.every((p: any) => p.role === null) && lb[0].name.startsWith("Name"), lb[0]);
ok("auditor sees roles", (await call(T[aud], "GET", `/api/session/${sid}/leaderboard`)).j.leaderboard.every((p: any) => p.role));

ok("citizen cannot use cooldown", (await call(T[cit], "POST", `/api/session/${sid}/cooldown`, { targetPlayerId: auth })).s === 403);
const cd = await call(T[aud], "POST", `/api/session/${sid}/cooldown`, { targetPlayerId: auth, reason: "test" });
ok("auditor cooldown on authority (180s)", cd.s === 200 && cd.j.cooldownDuration === 180, cd);
ok("auditor ability on cooldown", (await call(T[aud], "POST", `/api/session/${sid}/cooldown`, { targetPlayerId: atk })).s === 429);
await db.execute({ sql: "INSERT INTO certificates (id,session_id,player_id,player_name,problem_type,problem_id,score,created_at) VALUES ('x',?,?,?,?,?,?,?)", args: [sid, cit, "n", "aim", "aim_9", 50, Date.now()] });
ok("cooled-down authority blocked", (await call(T[auth], "POST", `/api/session/${sid}/certificates/x/process`, { action: "approve" })).s === 429);

await call(T.adm, "POST", "/api/admin/session/announce", { message: "Round starting!" });
ok("announcement visible", (await call(T[cit], "GET", `/api/session/${sid}/state`)).j.announcement === "Round starting!");
ok("admin next round", (await call(T.adm, "POST", "/api/admin/session/next-round")).j.newRound === 2);
await db.execute({ sql: "UPDATE sessions SET round_started_at = ? WHERE id = ?", args: [Date.now() - 6 * 60_000, sid] });
ok("timer auto-advances round", (await call(T[cit], "GET", `/api/session/${sid}/state`)).j.currentRound === 3);
await call(T.adm, "POST", "/api/admin/session/health", { value: 0 });
const end = await call(T[cit], "GET", `/api/session/${sid}/state`);
ok("health 0 -> attackers win", end.j.status === "completed" && end.j.winner === "attacker", end.j);
ok("roles revealed at end", (await call(T[cit], "GET", `/api/session/${sid}/leaderboard`)).j.leaderboard.every((p: any) => p.role));
const next = await call(T[cit], "POST", "/api/lobby/join");
ok("joining after game over opens a new lobby", next.j.sessionId && next.j.sessionId !== sid && next.j.status === "waiting", next);
const csv = await fetch(`${base}/api/admin/results.csv?session=${sid}`, { headers: { Authorization: `Bearer ${T.adm}` } });
ok("csv export", csv.status === 200 && (await csv.text()).split("\n").length === 7);
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
srv.close();
