import { Router } from "express";
import { db } from "../_lib/db.js";
import { requireAdmin } from "../_lib/auth.js";
import {
  ROLES, advanceRound, createSession, finishSession, getCurrentSession, getSession, logEvent, startGame, tick,
} from "../_lib/game.js";

const router = Router();
router.use(requireAdmin);

/** Session the dashboard is acting on: the open one, else the most recent. */
async function target() {
  const open = await getCurrentSession();
  if (open) return open;
  const r = await db.execute("SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1");
  return r.rows[0] ?? null;
}

const fail = (res: any, err: any, status = 400) => res.status(status).json({ error: err.message ?? String(err) });

// GET /api/admin/overview - everything the dashboard shows in one poll
router.get("/overview", async (_req, res) => {
  try {
    let s = await target();
    if (!s) { res.json({ success: true, session: null, sessions: [] }); return; }
    s = await tick(s);
    const sid = String(s.id);
    const [players, certs, events, sessions] = await Promise.all([
      db.execute({
        sql: `SELECT p.player_id, p.display_name, p.email, p.role, p.trust_score, p.cooldown_until, p.games_played,
                (SELECT COUNT(*) FROM certificates c WHERE c.session_id = p.session_id AND c.player_id = p.player_id) AS certs
              FROM players p WHERE p.session_id = ? ORDER BY p.trust_score DESC, p.display_name`,
        args: [sid],
      }),
      db.execute({
        sql: "SELECT status, COUNT(*) AS n, AVG(score) AS avg FROM certificates WHERE session_id = ? GROUP BY status",
        args: [sid],
      }),
      db.execute({
        sql: "SELECT * FROM events WHERE session_id = ? ORDER BY ts DESC LIMIT 40", args: [sid],
      }),
      db.execute("SELECT id, status, winner, created_at, current_round FROM sessions ORDER BY created_at DESC LIMIT 10"),
    ]);
    const roleCounts: Record<string, number> = {};
    players.rows.forEach((p) => { roleCounts[String(p.role)] = (roleCounts[String(p.role)] ?? 0) + 1; });
    const duration = Number(s.round_duration_ms);
    res.json({
      success: true,
      session: {
        id: sid, status: s.status, currentRound: Number(s.current_round), totalRounds: Number(s.total_rounds),
        globalHealth: Number(s.global_health), winner: s.winner, announcement: s.announcement ?? "",
        roundDurationMs: duration,
        roundEndsAt: s.status === "active" && duration > 0 && s.round_started_at != null
          ? Number(s.round_started_at) + duration : 0,
        createdAt: Number(s.created_at),
      },
      roleCounts,
      certificates: Object.fromEntries(certs.rows.map((c) => [c.status, { count: Number(c.n), avg: Number(c.avg ?? 0) }])),
      players: players.rows.map((p) => ({
        id: p.player_id, name: p.display_name, email: p.email, role: p.role, trust: Number(p.trust_score),
        cooldownUntil: Number(p.cooldown_until ?? 0), tasks: Number(p.certs),
      })),
      events: events.rows.map((e) => ({
        id: e.id, ts: Number(e.ts), kind: e.kind, actor: e.actor, target: e.target, detail: e.detail,
      })),
      sessions: sessions.rows.map((x) => ({
        id: x.id, status: x.status, winner: x.winner, createdAt: Number(x.created_at), round: Number(x.current_round),
      })),
    });
  } catch (err) { fail(res, err, 500); }
});

// POST /api/admin/session/new - close any open game and open a fresh lobby
router.post("/session/new", async (req, res) => {
  try {
    const open = await getCurrentSession();
    if (open) await finishSession(String(open.id), null);
    const rounds = Number(req.body?.totalRounds);
    const minutes = req.body?.roundMinutes;
    const id = await createSession(req.user!.uid, {
      totalRounds: Number.isFinite(rounds) && rounds > 0 ? Math.min(rounds, 20) : undefined,
      roundMinutes: minutes === undefined || minutes === "" ? undefined : Math.max(0, Number(minutes)),
    });
    await logEvent(id, "created", req.user!.email, null, null);
    res.json({ success: true, sessionId: id });
  } catch (err) { fail(res, err); }
});

// POST /api/admin/session/start { force? }
router.post("/session/start", async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open lobby");
    const roles = await startGame(String(s.id), req.user!.email, !!req.body?.force);
    res.json({ success: true, roles });
  } catch (err) { fail(res, err); }
});

router.post("/session/next-round", async (_req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open game");
    res.json({ success: true, ...(await advanceRound(String(s.id))) });
  } catch (err) { fail(res, err); }
});

// POST /api/admin/session/end { winner?: "citizen" | "attacker" | null }
router.post("/session/end", async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open game");
    const winner = req.body?.winner === "citizen" || req.body?.winner === "attacker" ? req.body.winner : null;
    await finishSession(String(s.id), winner);
    res.json({ success: true });
  } catch (err) { fail(res, err); }
});

// POST /api/admin/session/health { value }
router.post("/session/health", async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open game");
    const v = Math.max(0, Math.min(100, Number(req.body?.value)));
    if (!Number.isFinite(v)) throw new Error("value must be a number");
    await db.execute({ sql: "UPDATE sessions SET global_health = ? WHERE id = ?", args: [v, String(s.id)] });
    await logEvent(String(s.id), "health", req.user!.email, null, `set to ${v}`);
    res.json({ success: true });
  } catch (err) { fail(res, err); }
});

// POST /api/admin/session/announce { message } - banner shown to every player ("" clears it)
router.post("/session/announce", async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open game");
    const msg = String(req.body?.message ?? "").slice(0, 200);
    await db.execute({ sql: "UPDATE sessions SET announcement = ? WHERE id = ?", args: [msg || null, String(s.id)] });
    await logEvent(String(s.id), "announce", req.user!.email, null, msg);
    res.json({ success: true });
  } catch (err) { fail(res, err); }
});

// POST /api/admin/session/config { totalRounds?, roundMinutes? } - tune a running game
router.post("/session/config", async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open game");
    const sets: string[] = []; const args: any[] = [];
    if (req.body?.totalRounds !== undefined) {
      sets.push("total_rounds = ?"); args.push(Math.max(1, Math.min(20, Number(req.body.totalRounds))));
    }
    if (req.body?.roundMinutes !== undefined) {
      sets.push("round_duration_ms = ?"); args.push(Math.max(0, Number(req.body.roundMinutes)) * 60_000);
    }
    if (!sets.length) throw new Error("Nothing to update");
    await db.execute({ sql: `UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`, args: [...args, String(s.id)] });
    res.json({ success: true });
  } catch (err) { fail(res, err); }
});

// POST /api/admin/player/:pid { role?, cooldownSeconds?, trustScore? }
router.post("/player/:pid", async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open game");
    const sid = String(s.id), pid = String(req.params.pid);
    const sets: string[] = []; const args: any[] = [];
    if (req.body?.role !== undefined) {
      if (!(ROLES as readonly string[]).includes(req.body.role)) throw new Error("Invalid role");
      sets.push("role = ?"); args.push(req.body.role);
    }
    if (req.body?.cooldownSeconds !== undefined) {
      const sec = Math.max(0, Number(req.body.cooldownSeconds));
      sets.push("cooldown_until = ?"); args.push(sec > 0 ? Date.now() + sec * 1000 : 0);
    }
    if (req.body?.trustScore !== undefined) { sets.push("trust_score = ?"); args.push(Math.round(Number(req.body.trustScore))); }
    if (!sets.length) throw new Error("Nothing to update");
    const r = await db.execute({
      sql: `UPDATE players SET ${sets.join(", ")} WHERE session_id = ? AND player_id = ?`, args: [...args, sid, pid],
    });
    if (!r.rowsAffected) throw new Error("Player not found");
    await logEvent(sid, "admin_player", req.user!.email, pid, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (err) { fail(res, err); }
});

// DELETE /api/admin/player/:pid - remove a player from the game
router.delete("/player/:pid", async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) throw new Error("No open game");
    await db.execute({
      sql: "DELETE FROM players WHERE session_id = ? AND player_id = ?", args: [String(s.id), String(req.params.pid)],
    });
    await logEvent(String(s.id), "kick", req.user!.email, String(req.params.pid), null);
    res.json({ success: true });
  } catch (err) { fail(res, err); }
});

// GET /api/admin/results.csv?session=<id> - final standings for the organisers
router.get("/results.csv", async (req, res) => {
  try {
    const sid = String(req.query.session ?? (await target())?.id ?? "");
    if (!sid || !(await getSession(sid))) throw new Error("Session not found");
    const r = await db.execute({
      sql: `SELECT display_name, email, role, trust_score,
              (SELECT COUNT(*) FROM certificates c WHERE c.session_id = p.session_id AND c.player_id = p.player_id) AS tasks
            FROM players p WHERE session_id = ? ORDER BY trust_score DESC`,
      args: [sid],
    });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = ["name,email,role,trust_score,tasks", ...r.rows.map((x) =>
      [x.display_name, x.email, x.role, x.trust_score, x.tasks].map(esc).join(","))];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="results-${sid}.csv"`);
    res.send(lines.join("\n"));
  } catch (err) { fail(res, err); }
});

export default router;
