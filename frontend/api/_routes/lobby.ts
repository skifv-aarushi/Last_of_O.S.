import { Router } from "express";
import { db } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { CONFIG, createSession, getCurrentSession, getPlayer, isAdminEmail } from "../_lib/game.js";

const router = Router();

// GET /api/lobby - the open game (if any) and whether the caller is in it
router.get("/", requireAuth, async (req, res) => {
  try {
    const s = await getCurrentSession();
    if (!s) { res.json({ success: true, sessionId: null, isAdmin: isAdminEmail(req.user!.email) }); return; }
    const sid = String(s.id);
    const [p, c] = await Promise.all([
      getPlayer(sid, req.user!.uid),
      db.execute({ sql: "SELECT COUNT(*) AS n FROM players WHERE session_id = ?", args: [sid] }),
    ]);
    res.json({
      success: true, sessionId: sid, status: s.status, joined: !!p,
      role: p?.role ?? null, totalPlayers: Number(c.rows[0].n),
      isAdmin: isAdminEmail(req.user!.email),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/lobby/join - join the open game, creating a lobby if none exists yet
router.post("/join", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.uid;
    let s = await getCurrentSession();
    if (!s) {
      await createSession(uid);
      s = (await getCurrentSession())!;
    }
    const sid = String(s.id);
    const existing = await getPlayer(sid, uid);
    if (!existing) {
      const c = await db.execute({ sql: "SELECT COUNT(*) AS n FROM players WHERE session_id = ?", args: [sid] });
      if (Number(c.rows[0].n) >= CONFIG.MAX_PLAYERS) { res.status(400).json({ error: "Session full" }); return; }
    }
    const name = String(req.body?.displayName || "").slice(0, 60) ||
      String((await db.execute({ sql: "SELECT display_name FROM users WHERE id = ?", args: [uid] })).rows[0]?.display_name ?? "Player");
    // late joiners enter as citizens; returning players keep their role
    await db.execute({
      sql: `INSERT INTO players (session_id, player_id, display_name, email, joined_at) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(session_id, player_id) DO UPDATE SET display_name = excluded.display_name`,
      args: [sid, uid, name, req.user!.email, Date.now()],
    });
    const p = await getPlayer(sid, uid);
    res.json({ success: true, sessionId: sid, status: s.status, role: p?.role ?? "citizen" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
