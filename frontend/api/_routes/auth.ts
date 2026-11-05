import { Router } from "express";
import { db } from "../_lib/db.js";
import {
  CODE_TTL_MS, MAX_ATTEMPTS, RESEND_AFTER_MS, codesMatch, hashLoginCode, isVitEmail, nameFromEmail,
  newLoginCode, requireAuth, signSession, uidForEmail,
} from "../_lib/auth.js";
import { isAdminEmail } from "../_lib/game.js";
import { sendLoginCode } from "../_lib/mail.js";

const router = Router();

const clean = (v: unknown) => String(v ?? "").trim().toLowerCase();

// POST /api/auth/request-code { email } - email a one-time code to a @vitstudent.ac.in address
router.post("/request-code", async (req, res) => {
  const email = clean(req.body?.email);
  if (!isVitEmail(email)) {
    res.status(400).json({ error: "Use your @vitstudent.ac.in email address." }); return;
  }
  try {
    const existing = await db.execute({ sql: "SELECT sent_at FROM login_codes WHERE email = ?", args: [email] });
    const wait = existing.rows.length ? Number(existing.rows[0].sent_at) + RESEND_AFTER_MS - Date.now() : 0;
    if (wait > 0) {
      res.status(429).json({ error: `Wait ${Math.ceil(wait / 1000)}s before requesting another code.` }); return;
    }
    const { code } = newLoginCode();
    const now = Date.now();
    await db.execute({
      sql: `INSERT INTO login_codes (email, code_hash, expires_at, attempts, sent_at) VALUES (?, ?, ?, 0, ?)
            ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
              attempts = 0, sent_at = excluded.sent_at`,
      args: [email, hashLoginCode(email, code), now + CODE_TTL_MS, now],
    });
    await sendLoginCode(email, code);
    res.json({ success: true });
  } catch (err: any) {
    console.error("request-code failed:", err);
    res.status(500).json({ error: "Could not send the code. Try again in a minute." });
  }
});

// POST /api/auth/verify-code { email, code } - exchange the code for a session token
router.post("/verify-code", async (req, res) => {
  const email = clean(req.body?.email);
  const code = String(req.body?.code ?? "").trim();
  if (!isVitEmail(email) || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "Enter the 6-digit code from your email." }); return;
  }
  try {
    const r = await db.execute({ sql: "SELECT * FROM login_codes WHERE email = ?", args: [email] });
    const row = r.rows[0];
    if (!row || Number(row.expires_at) < Date.now()) {
      res.status(401).json({ error: "That code has expired. Request a new one." }); return;
    }
    if (Number(row.attempts) >= MAX_ATTEMPTS) {
      res.status(429).json({ error: "Too many wrong attempts. Request a new code." }); return;
    }
    if (!codesMatch(email, code, String(row.code_hash))) {
      await db.execute({ sql: "UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?", args: [email] });
      res.status(401).json({ error: "Wrong code." }); return;
    }
    // single use: only the request that deletes the row gets a session
    const used = await db.execute({
      sql: "DELETE FROM login_codes WHERE email = ? AND code_hash = ?", args: [email, String(row.code_hash)],
    });
    if (!used.rowsAffected) { res.status(401).json({ error: "That code was already used." }); return; }

    const uid = uidForEmail(email);
    const name = nameFromEmail(email);
    await db.execute({
      sql: `INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING`,
      args: [uid, email, name, Date.now()],
    });
    const stored = await db.execute({ sql: "SELECT display_name FROM users WHERE id = ?", args: [uid] });
    const token = await signSession(uid, email);
    res.json({
      success: true, token,
      user: { uid, email, displayName: String(stored.rows[0]?.display_name ?? name), isAdmin: isAdminEmail(email) },
    });
  } catch (err: any) {
    console.error("verify-code failed:", err);
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
