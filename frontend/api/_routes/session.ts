import { Router } from "express";
import { db } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { getPlayer, getSession, isAdminEmail, tick } from "../_lib/game.js";

const router = Router();

// GET /api/session/:id/state - Current game state for the calling player
router.get("/:id/state", requireAuth, async (req, res) => {
  try {
    const sid = String(req.params.id);
    let session = await getSession(sid);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    session = await tick(session);
    const [p, c] = await Promise.all([
      getPlayer(sid, req.user!.uid),
      db.execute({ sql: "SELECT COUNT(*) AS n FROM players WHERE session_id = ?", args: [sid] }),
    ]);
    const duration = Number(session.round_duration_ms);
    res.json({
      success: true,
      sessionId: sid,
      globalHealth: Number(session.global_health),
      currentRound: Number(session.current_round),
      totalRounds: Number(session.total_rounds),
      status: session.status,
      winner: session.winner ?? undefined,
      announcement: session.announcement ?? "",
      roundEndsAt: session.status === "active" && duration > 0 && session.round_started_at != null
        ? Number(session.round_started_at) + duration : 0,
      joined: !!p,
      displayName: p?.display_name ?? "",
      playerRole: p?.role ?? null,
      playerTrustScore: Number(p?.trust_score ?? 0),
      cooldownUntil: Number(p?.cooldown_until ?? 0),
      nextGameAt: Number(p?.next_game_at ?? 0),
      abilityCooldownUntil: Number(p?.ability_cooldown_until ?? 0),
      totalPlayers: Number(c.rows[0].n),
      isAdmin: isAdminEmail(req.user!.email),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/session/:id/leaderboard - roles are only revealed to the auditor
router.get("/:id/leaderboard", requireAuth, async (req, res) => {
  try {
    const sid = String(req.params.id);
    const me = await getPlayer(sid, req.user!.uid);
    const session = await getSession(sid);
    // roles stay secret from everyone but the auditor until the game is over
    const canSeeRoles = me?.role === "auditor" || isAdminEmail(req.user!.email) || session?.status === "completed";
    const r = await db.execute({
      sql: `SELECT player_id, display_name, trust_score, role, cooldown_until FROM players
            WHERE session_id = ? ORDER BY trust_score DESC, display_name ASC`,
      args: [sid],
    });
    res.json({
      success: true,
      leaderboard: r.rows.map((x) => ({
        playerId: x.player_id,
        name: x.display_name ?? "Player",
        trustScore: Number(x.trust_score),
        role: canSeeRoles ? x.role : null,
        cooldownUntil: Number(x.cooldown_until ?? 0),
      })),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
