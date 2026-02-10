import { Router } from "express";
import { db } from "../lib/firebase-admin";
import { requireAuth } from "../middleware/auth";
import admin from "firebase-admin";
 
const router = Router();
 
// GET /api/session/:id/ledger
router.get("/:id/ledger", requireAuth, async (req, res) => {
  try {
    const snap = await db.collection("sessions").doc(req.params.id)
      .collection("ledger").orderBy("timestamp", "desc").get();
    const entries = snap.docs.map(doc => ({
      certificateId: doc.data().certificateId,
      playerId: doc.data().playerId,
      playerName: doc.data().playerName,
      authorityId: doc.data().authorityId,
      action: doc.data().action,
      score: doc.data().score,
      wasInfected: doc.data().wasInfected,
      healthChange: doc.data().healthChange,
      timestamp: doc.data().timestamp?.toMillis?.() ?? Date.now(),
    }));
    res.json({ success: true, entries });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// POST /api/session/:id/cooldown
router.post("/:id/cooldown", requireAuth, async (req, res) => {
  try {
    const { targetPlayerId, reason } = req.body;
    if (!targetPlayerId) {
      res.status(400).json({ error: "targetPlayerId required" }); return;
    }
    const playerRef = db.collection("sessions").doc(req.params.id)
      .collection("players").doc(targetPlayerId);
    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) { res.status(404).json({ error: "Player not found" }); return; }
    const cooldownMs = 5 * 60 * 1000;
    const futureDate = new Date(Date.now() + cooldownMs);
    await playerRef.update({
      cooldownUntil: admin.firestore.Timestamp.fromDate(futureDate),
    });
    res.json({ success: true,
      message: `Player ${targetPlayerId} on cooldown until ${futureDate.toISOString()}`,
      cooldownUntil: futureDate.getTime() });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
export default router;
