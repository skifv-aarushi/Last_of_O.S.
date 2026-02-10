import { RequestHandler } from "express";
import { authAdmin } from "../lib/firebase-admin";
 
declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email: string; };
    }
  }
}
 
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "No authorization token provided" });
      return;
    }
    const idToken = header.split("Bearer ")[1];
    const decoded = await authAdmin.verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email ?? "" };
    next();
  } catch (err: any) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
