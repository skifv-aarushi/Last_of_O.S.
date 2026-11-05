import type { Row } from "@libsql/client";
import { db, newId } from "./db.js";

export const CONFIG = {
  MAX_PLAYERS: 300,
  MIN_PLAYERS: 4,
  TOTAL_ROUNDS: 4,
  ROUND_DURATION_MS: 5 * 60 * 1000,
  MINOR_INFECTION_PENALTY: 6,
  MAJOR_INFECTION_PENALTY: 10,
  ATTACKER_COOLDOWN_MS: 2 * 60 * 1000,
  AUTHORITY_COOLDOWN_MS: 3 * 60 * 1000,
  AUDITOR_ABILITY_COOLDOWN_MS: 6 * 60 * 1000,
  BUFFER_MIN_MS: 5 * 1000,
  BUFFER_MAX_MS: 15 * 1000,
};

// citizens : attackers among the non-staff players, per round
export const ROUND_RATIOS = [
  { citizens: 2, attackers: 1 },
  { citizens: 1.5, attackers: 1 },
  { citizens: 1.2, attackers: 1 },
  { citizens: 1, attackers: 1 },
];

export const ROLES = ["citizen", "attacker", "authority", "auditor"] as const;
export type Role = (typeof ROLES)[number];

export const isAdminEmail = (email: string) =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

export async function logEvent(
  sessionId: string, kind: string, actor: string | null, target: string | null, detail: string | null
) {
  await db.execute({
    sql: "INSERT INTO events (id, session_id, ts, kind, actor, target, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [newId(), sessionId, Date.now(), kind, actor, target, detail],
  });
}

/** The open (waiting/active) session players join, if any. */
export async function getCurrentSession(): Promise<Row | null> {
  const r = await db.execute(
    "SELECT * FROM sessions WHERE status != 'completed' ORDER BY created_at DESC LIMIT 1"
  );
  return r.rows[0] ?? null;
}

export async function getSession(id: string): Promise<Row | null> {
  const r = await db.execute({ sql: "SELECT * FROM sessions WHERE id = ?", args: [id] });
  return r.rows[0] ?? null;
}

export async function createSession(hostUid: string, opts: { totalRounds?: number; roundMinutes?: number } = {}) {
  const id = newId();
  const roundMs = opts.roundMinutes === undefined ? CONFIG.ROUND_DURATION_MS : Math.max(0, opts.roundMinutes) * 60_000;
  await db.execute({
    sql: `INSERT INTO sessions (id, host_uid, total_rounds, round_duration_ms, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, hostUid, opts.totalRounds ?? CONFIG.TOTAL_ROUNDS, roundMs, Date.now()],
  });
  return id;
}

export async function finishSession(sessionId: string, winner: string | null) {
  const r = await db.execute({
    sql: "UPDATE sessions SET status = 'completed', winner = ?, ended_at = ? WHERE id = ? AND status != 'completed'",
    args: [winner, Date.now(), sessionId],
  });
  if (r.rowsAffected) await logEvent(sessionId, "game_over", null, null, `winner: ${winner ?? "none"}`);
}

/**
 * Advances the round (or ends the game) if the round timer has elapsed.
 * Evaluated lazily on reads so no background worker is needed on serverless.
 */
export async function tick(session: Row): Promise<Row> {
  if (session.status !== "active") return session;
  const sid = String(session.id);

  if (Number(session.global_health) <= 0) {
    await finishSession(sid, "attacker");
    return (await getSession(sid))!;
  }
  const duration = Number(session.round_duration_ms);
  if (duration > 0 && session.round_started_at != null) {
    const started = Number(session.round_started_at);
    const now = Date.now();
    if (now >= started + duration) {
      const round = Number(session.current_round);
      if (round >= Number(session.total_rounds)) {
        await finishSession(sid, "citizen");
      } else {
        const r = await db.execute({
          sql: `UPDATE sessions SET current_round = current_round + 1, round_started_at = ?
                WHERE id = ? AND status = 'active' AND current_round = ?`,
          args: [now, sid, round],
        });
        if (r.rowsAffected) await logEvent(sid, "round", null, null, `round ${round + 1}`);
      }
      return (await getSession(sid))!;
    }
  }
  return session;
}

/** Manually advance (admin). Returns the outcome. */
export async function advanceRound(sessionId: string) {
  const s = await getSession(sessionId);
  if (!s || s.status !== "active") throw new Error("Game is not active");
  const round = Number(s.current_round);
  if (Number(s.global_health) <= 0) { await finishSession(sessionId, "attacker"); return { gameOver: true, winner: "attacker" }; }
  if (round >= Number(s.total_rounds)) { await finishSession(sessionId, "citizen"); return { gameOver: true, winner: "citizen" }; }
  await db.execute({
    sql: "UPDATE sessions SET current_round = ?, round_started_at = ? WHERE id = ?",
    args: [round + 1, Date.now(), sessionId],
  });
  await logEvent(sessionId, "round", null, null, `round ${round + 1}`);
  return { gameOver: false, newRound: round + 1 };
}

/** Port of the original role distribution: ~10% authority, ~5% auditor, rest split citizens/attackers. */
export function assignRoles(ids: string[], round = 1): Record<string, Role> {
  const total = ids.length;
  const ratio = ROUND_RATIOS[Math.min(round, ROUND_RATIOS.length) - 1];
  let authority = Math.max(1, Math.floor(total * 0.1));
  let auditor = Math.max(1, Math.floor(total * 0.05));
  // tiny lobbies (admin forced start): never hand out more staff roles than players
  while (authority + auditor >= total && (authority > 0 || auditor > 0)) {
    if (auditor > 0) auditor--; else authority--;
  }
  const others = total - authority - auditor;
  const citizens = Math.round(others * (ratio.citizens / (ratio.citizens + ratio.attackers)));
  const attackers = others - citizens;

  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const plan: Role[] = [
    ...Array(authority).fill("authority"),
    ...Array(auditor).fill("auditor"),
    ...Array(attackers).fill("attacker"),
    ...Array(citizens).fill("citizen"),
  ];
  const roles: Record<string, Role> = {};
  shuffled.forEach((id, i) => { roles[id] = plan[i] ?? "citizen"; });
  return roles;
}

export async function startGame(sessionId: string, actor: string, force = false) {
  const s = await getSession(sessionId);
  if (!s) throw new Error("Session not found");
  if (s.status !== "waiting") throw new Error("Game already started");
  const players = await db.execute({ sql: "SELECT player_id FROM players WHERE session_id = ?", args: [sessionId] });
  const ids = players.rows.map((r) => String(r.player_id));
  if (!force && ids.length < CONFIG.MIN_PLAYERS) throw new Error(`Need at least ${CONFIG.MIN_PLAYERS} players`);
  if (ids.length === 0) throw new Error("No players have joined");
  const roles = assignRoles(ids, 1);
  await db.batch([
    ...Object.entries(roles).map(([id, role]) => ({
      sql: "UPDATE players SET role = ?, trust_score = 0, cooldown_until = 0, next_game_at = 0 WHERE session_id = ? AND player_id = ?",
      args: [role, sessionId, id],
    })),
    {
      sql: "UPDATE sessions SET status = 'active', current_round = 1, round_started_at = ? WHERE id = ?",
      args: [Date.now(), sessionId],
    },
  ], "write");
  await logEvent(sessionId, "start", actor, null, `${ids.length} players`);
  return roles;
}

export const randomBuffer = () =>
  CONFIG.BUFFER_MIN_MS + Math.floor(Math.random() * (CONFIG.BUFFER_MAX_MS - CONFIG.BUFFER_MIN_MS + 1));

export async function getPlayer(sessionId: string, uid: string): Promise<Row | null> {
  const r = await db.execute({
    sql: "SELECT * FROM players WHERE session_id = ? AND player_id = ?", args: [sessionId, uid],
  });
  return r.rows[0] ?? null;
}
