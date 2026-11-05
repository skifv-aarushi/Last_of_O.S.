import { RequestHandler } from "express";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { isAdminEmail } from "./game.js";

const SESSION_TTL = "12h";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email: string };
    }
  }
}

/** Stable player id derived from the email, so the same student is always the same player. */
export const uidForEmail = (email: string) =>
  "u" + createHash("sha256").update(email).digest("hex").slice(0, 19);

export const isVitEmail = (email: string) =>
  /^[a-z0-9._+-]+@vitstudent\.ac\.in$/.test(email);

/** "aarav.sharma2023@vitstudent.ac.in" -> "Aarav Sharma" */
export function nameFromEmail(email: string) {
  const local = email.split("@")[0].replace(/[0-9]+/g, " ").replace(/[._+-]+/g, " ").trim();
  return local.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || "Player";
}

export const signSession = (uid: string, email: string) =>
  new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No authorization token provided" });
    return;
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), secret());
    req.user = { uid: payload.sub!, email: String(payload.email ?? "") };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    if (!isAdminEmail(req.user!.email)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
};
