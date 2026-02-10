import { Router } from "express";
import { authAdmin, db } from "../lib/firebase-admin";
import { requireAuth } from "../middleware/auth";
 
const router = Router();
 
// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) { res.status(400).json({ error: "idToken is required" }); return; }
    const decoded = await authAdmin.verifyIdToken(idToken);
    res.json({ success: true, uid: decoded.uid });
  } catch (err: any) {
    res.status(401).json({ error: "Token verification failed" });
  }
});
 
// POST /api/auth/register
router.post("/register", requireAuth, async (req, res) => {
  try {
    const { email, displayName } = req.body;
    const uid = req.user!.uid;
    const userRef = db.collection("users").doc(uid);
    const existing = await userRef.get();
    if (existing.exists) {
      res.json({ success: true, userId: uid, message: "User already exists", tempPassword: "" });
      return;
    }
    await userRef.set({ email, displayName, createdAt: new Date() });
    res.json({ success: true, userId: uid, message: "User registered", tempPassword: "" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
export default router;
