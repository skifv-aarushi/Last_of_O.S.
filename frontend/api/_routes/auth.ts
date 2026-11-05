import { Router } from "express";
import { db } from "../_lib/db.js";
import { isVitEmail, nameFromEmail, requireAuth, signSession, uidForEmail } from "../_lib/auth.js";
import { clerkImpl } from "../_lib/clerk.js";
import { isAdminEmail } from "../_lib/game.js";

const router = Router();

// POST /api/auth/clerk { token } - exchange a Clerk session token for a game session.
// Clerk proves the player owns the email address; this is where we insist it is a VIT one.
router.post("/clerk", async (req, res) => {
  const token = String(req.body?.token ?? "");
  if (!token) { res.status(400).json({ error: "token is required" }); return; }

  let identity;
  try {
    identity = await clerkImpl.verify(token);
  } catch (err: any) {
    console.error("clerk verify failed:", err?.message ?? err);
    res.status(401).json({ error: "Sign-in could not be verified. Try again." }); return;
  }
  identity.email = identity.email.trim().toLowerCase();
  if (!isVitEmail(identity.email)) {
    res.status(403).json({ error: "Only @vitstudent.ac.in email addresses can play." }); return;
  }

  try {
    const uid = uidForEmail(identity.email);
    const name = identity.name.trim() || nameFromEmail(identity.email);
    await db.execute({
      sql: `INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name`,
      args: [uid, identity.email, name, Date.now()],
    });
    res.json({
      success: true,
      token: await signSession(uid, identity.email),
      user: { uid, email: identity.email, displayName: name, isAdmin: isAdminEmail(identity.email) },
    });
  } catch (err: any) {
    console.error("clerk login failed:", err);
    res.status(500).json({ error: "Sign-in failed. Try again." });
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

// POST /api/auth/register - kept for client compatibility; users are created at sign-in
router.post("/register", requireAuth, (req, res) => {
  res.json({ success: true, userId: req.user!.uid, message: "User registered", tempPassword: "" });
});

export default router;
