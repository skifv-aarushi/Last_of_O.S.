import { Router } from "express";
import { db, newId } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { getPlayer, getSession, tick } from "../_lib/game.js";

const router = Router();

async function authorityGate(sessionId: string, uid: string) {
  const session = await getSession(sessionId);
  if (!session) return { status: 404, error: "Session not found" } as const;
  const live = await tick(session);
  const me = await getPlayer(sessionId, uid);
  if (!me || me.role !== "authority") return { status: 403, error: "Authority role required" } as const;
  return { session: live, me } as const;
}

// GET /api/session/:id/certificates/pending
router.get("/:id/certificates/pending", requireAuth, async (req, res) => {
  try {
    const sid = String(req.params.id);
    const g = await authorityGate(sid, req.user!.uid);
    if ("error" in g) { res.status(g.status).json({ error: g.error }); return; }
    const r = await db.execute({
      sql: `SELECT id, player_name, problem_type, score, created_at FROM certificates
            WHERE session_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 50`,
      args: [sid],
    });
    res.json({
      success: true,
      cooldownUntil: Number(g.me.cooldown_until ?? 0),
      certificates: r.rows.map((x) => ({
        id: x.id, playerName: x.player_name ?? "Unknown", problemType: x.problem_type, score: Number(x.score),
        createdAt: Number(x.created_at),
      })),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/session/:id/certificates/:certId/process
// APPROVED + honest:   Health += score/10, trust += 5
// APPROVED + infected: Health -= score/5,  trust += 3
// REJECTED + honest:   Health -= 5,        trust -= 3
// REJECTED + infected: Health += 5,        trust -= 5
router.post("/:id/certificates/:certId/process", requireAuth, async (req, res) => {
  try {
    const { action } = req.body ?? {};
    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be approve or reject" }); return;
    }
    const sid = String(req.params.id);
    const g = await authorityGate(sid, req.user!.uid);
    if ("error" in g) { res.status(g.status).json({ error: g.error }); return; }
    if (g.session.status !== "active") { res.status(400).json({ error: "The game is not running" }); return; }
    const cd = Number(g.me.cooldown_until ?? 0);
    if (cd > Date.now()) {
      res.status(429).json({ error: `On cooldown: ${Math.ceil((cd - Date.now()) / 1000)}s` }); return;
    }

    const c = await db.execute({
      sql: "SELECT * FROM certificates WHERE id = ? AND session_id = ?", args: [String(req.params.certId), sid],
    });
    if (!c.rows.length) { res.status(404).json({ error: "Certificate not found" }); return; }
    const cert = c.rows[0];
    const wasInfected = cert.infection_level !== "none";
    const score = Number(cert.score);
    let healthChange: number, trustChange: number;
    if (action === "approve") {
      if (wasInfected) { healthChange = -Math.round(score / 5); trustChange = 3; }
      else { healthChange = Math.round(score / 10); trustChange = 5; }
    } else {
      if (wasInfected) { healthChange = 5; trustChange = -5; }
      else { healthChange = -5; trustChange = -3; }
    }

    // Atomically claim the certificate so concurrent requests cannot process it twice
    const claim = await db.execute({
      sql: `UPDATE certificates SET status = ?, authority_id = ?, health_change = ?, processed_at = ?
            WHERE id = ? AND status = 'pending'`,
      args: [action === "approve" ? "approved" : "rejected", req.user!.uid, healthChange, Date.now(), String(req.params.certId)],
    });
    if (claim.rowsAffected === 0) { res.status(400).json({ error: "Already processed" }); return; }

    await db.batch([
      {
        sql: "UPDATE sessions SET global_health = MAX(0, MIN(100, global_health + ?)) WHERE id = ? AND status = 'active'",
        args: [healthChange, sid],
      },
      {
        sql: `UPDATE sessions SET status = 'completed', winner = 'attacker', ended_at = ?
              WHERE id = ? AND status = 'active' AND global_health <= 0`,
        args: [Date.now(), sid],
      },
      {
        sql: "UPDATE players SET trust_score = trust_score + ? WHERE session_id = ? AND player_id = ?",
        args: [trustChange, sid, cert.player_id],
      },
      {
        sql: `INSERT INTO ledger (id, session_id, certificate_id, player_id, player_name, authority_id,
                action, score, was_infected, health_change, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newId(), sid, String(req.params.certId), cert.player_id, String(cert.player_name ?? "Unknown"),
               req.user!.uid, action === "approve" ? "approved" : "rejected", score,
               wasInfected ? 1 : 0, healthChange, Date.now()],
      },
    ], "write");

    const s = await getSession(sid);
    res.json({
      success: true, approved: action === "approve", healthChange,
      winner: s?.winner ?? null,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
