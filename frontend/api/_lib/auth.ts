import { RequestHandler } from "express";
import { SignJWT, jwtVerify } from "jose";
import { isAdminEmail } from "./game.js";

const ALLOWED_DOMAIN = "vitstudent.ac.in";
const SESSION_TTL = "12h";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email: string };
    }
  }
}

export interface GoogleProfile {
  uid: string;
  email: string;
  name: string;
}

/**
 * Validates a Google OAuth access token: it must have been issued to OUR client id
 * and belong to a verified @vitstudent.ac.in account.
 */
export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleProfile> {
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!infoRes.ok) throw new Error("Invalid Google token");
  const info = await infoRes.json();
  if (info.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("Token was not issued for this app");

  const profRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profRes.ok) throw new Error("Could not read Google profile");
  const p = await profRes.json();

  const email: string = (p.email ?? "").toLowerCase();
  if (!p.email_verified || !email.endsWith(`@${ALLOWED_DOMAIN}`) || p.hd !== ALLOWED_DOMAIN) {
    throw new Error(`Only VIT student emails (@${ALLOWED_DOMAIN}) are allowed.`);
  }
  return { uid: p.sub, email, name: p.name ?? "Player" };
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
