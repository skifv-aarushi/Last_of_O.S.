import { Router } from "express";
import { db } from "../_lib/db.js";
import { isAdminEmail } from "../_lib/game.js";
import { requireAuth, signSession, verifyGoogleAccessToken } from "../_lib/auth.js";

const router = Router();

// POST /api/auth/google - exchange a Google access token for a session token
router.post("/google", async (req, res) => {
  const { accessToken } = req.body ?? {};
  if (!accessToken) { res.status(400).json({ error: "accessToken is required" }); return; }
  try {
    const profile = await verifyGoogleAccessToken(accessToken);
    await db.execute({
      sql: `INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name`,
      args: [profile.uid, profile.email, profile.name, Date.now()],
    });
    const token = await signSession(profile.uid, profile.email);
    res.json({
      success: true, token,
      user: {
        uid: profile.uid, email: profile.email, displayName: profile.name,
        isAdmin: isAdminEmail(profile.email),
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message ?? "Sign-in failed" });
  }
});

// POST /api/auth/refresh - re-issue a session token while the current one is still valid
router.post("/refresh", requireAuth, async (req, res) => {
  res.json({ success: true, token: await signSession(req.user!.uid, req.user!.email) });
});

// POST /api/auth/verify
router.post("/verify", requireAuth, (req, res) => {
  res.json({ success: true, uid: req.user!.uid });
});

// POST /api/auth/register - kept for client compatibility; users are upserted at sign-in
router.post("/register", requireAuth, (req, res) => {
  res.json({ success: true, userId: req.user!.uid, message: "User registered", tempPassword: "" });
});

export default router;
