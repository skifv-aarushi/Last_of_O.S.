import { Router } from "express";
import { db } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { CONFIG, getPlayer, getSession, isAdminEmail, logEvent, tick } from "../_lib/game.js";

const router = Router();

// GET /api/session/:id/ledger
// Auditors see every entry (including whether it was infected); everyone else only the entries
// they took part in (as the player or as the deciding authority), with the infection flag hidden.
router.get("/:id/ledger", requireAuth, async (req, res) => {
  try {
    const sid = String(req.params.id);
    const me = await getPlayer(sid, req.user!.uid);
    const full = me?.role === "auditor" || isAdminEmail(req.user!.email);
    const r = await db.execute({
      sql: `SELECT * FROM ledger WHERE session_id = ? ${full ? "" : "AND (player_id = ? OR authority_id = ?)"} ORDER BY timestamp DESC LIMIT 500`,
      args: full ? [sid] : [sid, req.user!.uid, req.user!.uid],
    });
    res.json({
      success: true,
      entries: r.rows.map((x) => ({
        certificateId: x.certificate_id, playerId: x.player_id, playerName: x.player_name,
        authorityId: x.authority_id, action: x.action, score: Number(x.score),
        wasInfected: full ? !!x.was_infected : false, healthChange: Number(x.health_change),
        timestamp: Number(x.timestamp),
      })),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/session/:id/cooldown - auditor ability, itself on a cooldown
router.post("/:id/cooldown", requireAuth, async (req, res) => {
  try {
    const { targetPlayerId, reason } = req.body ?? {};
    if (!targetPlayerId) { res.status(400).json({ error: "targetPlayerId required" }); return; }
    const sid = String(req.params.id);
    const session = await getSession(sid);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    if ((await tick(session)).status !== "active") { res.status(400).json({ error: "The game is not running" }); return; }

    const auditor = await getPlayer(sid, req.user!.uid);
    if (!auditor || auditor.role !== "auditor") { res.status(403).json({ error: "Auditor role required" }); return; }
    const now = Date.now();
    if (Number(auditor.ability_cooldown_until ?? 0) > now) {
      res.status(429).json({ error: "Ability on cooldown", abilityCooldownUntil: Number(auditor.ability_cooldown_until) });
      return;
    }
    const target = await getPlayer(sid, String(targetPlayerId));
    if (!target) { res.status(404).json({ error: "Player not found" }); return; }
    if (target.role === "auditor") { res.status(400).json({ error: "Cannot target an auditor" }); return; }

    const duration = target.role === "authority" ? CONFIG.AUTHORITY_COOLDOWN_MS : CONFIG.ATTACKER_COOLDOWN_MS;
    const until = now + duration;
    await db.batch([
      {
        sql: "UPDATE players SET cooldown_until = ? WHERE session_id = ? AND player_id = ?",
        args: [until, sid, String(targetPlayerId)],
      },
      {
        sql: "UPDATE players SET ability_cooldown_until = ? WHERE session_id = ? AND player_id = ?",
        args: [now + CONFIG.AUDITOR_ABILITY_COOLDOWN_MS, sid, req.user!.uid],
      },
    ], "write");
    await logEvent(sid, "cooldown", req.user!.uid, String(targetPlayerId), String(reason ?? "").slice(0, 200));
    res.json({
      success: true, cooldownDuration: Math.round(duration / 1000), cooldownUntil: until,
      abilityCooldownUntil: now + CONFIG.AUDITOR_ABILITY_COOLDOWN_MS,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
