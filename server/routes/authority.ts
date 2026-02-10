import { Router } from "express";
import { db } from "../lib/firebase-admin";
import { requireAuth } from "../middleware/auth";
import admin from "firebase-admin";
 
const router = Router();
 
// GET /api/session/:id/certificates/pending
router.get("/:id/certificates/pending", requireAuth, async (req, res) => {
  try {
    const snap = await db.collection("sessions").doc(req.params.id)
      .collection("certificates").where("status", "==", "pending")
      .orderBy("createdAt", "asc").get();
    const certificates = snap.docs.map(doc => ({
      id: doc.id, problemType: doc.data().problemType,
      score: doc.data().score,
      createdAt: doc.data().createdAt?.toMillis?.() ?? Date.now(),
    }));
    res.json({ success: true, certificates });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// POST /api/session/:id/certificates/:certId/process
// GAME LOGIC:
// APPROVED + citizen: Health += score/10, trust += 5
// APPROVED + attacker: Health -= score/5, trust += 3
// REJECTED + citizen: Health -= 5, trust -= 3
// REJECTED + attacker: Health += 5, trust -= 5
router.post("/:id/certificates/:certId/process", requireAuth, async (req, res) => {
  try {
    const { action, medianEstimate } = req.body;
    if (!action || !["approve","reject"].includes(action)) {
      res.status(400).json({ error: "action must be approve or reject" }); return;
    }
    const sessionRef = db.collection("sessions").doc(req.params.id);
    const certRef = sessionRef.collection("certificates").doc(req.params.certId);
    const certDoc = await certRef.get();
    if (!certDoc.exists) { res.status(404).json({ error: "Certificate not found" }); return; }
    const cert = certDoc.data()!;
    if (cert.status !== "pending") {
      res.status(400).json({ error: "Already processed" }); return;
    }
    const playerDoc = await sessionRef.collection("players").doc(cert.playerId).get();
    const isAttacker = playerDoc.data()?.role === "attacker";
    const wasInfected = cert.infectionLevel !== "none" || isAttacker;
    let healthChange = 0, trustChange = 0;
    if (action === "approve") {
      if (wasInfected) { healthChange = -Math.round(cert.score/5); trustChange = 3; }
      else { healthChange = Math.round(cert.score/10); trustChange = 5; }
    } else {
      if (wasInfected) { healthChange = 5; trustChange = -5; }
      else { healthChange = -5; trustChange = -3; }
    }
    const batch = db.batch();
    batch.update(certRef, {
      status: action === "approve" ? "approved" : "rejected",
      authorityId: req.user!.uid, healthChange,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const sessionDoc = await sessionRef.get();
    const currentHealth = sessionDoc.data()!.globalHealth;
    const newHealth = Math.max(0, Math.min(100, currentHealth + healthChange));
    const updateData = { globalHealth: newHealth };
    let winner = null;
    if (newHealth <= 0) {
      updateData.status = "completed"; updateData.winner = "attacker";
      winner = "attacker";
    }
    batch.update(sessionRef, updateData);
    batch.update(sessionRef.collection("players").doc(cert.playerId), {
      trustScore: admin.firestore.FieldValue.increment(trustChange),
    });
    batch.set(sessionRef.collection("ledger").doc(), {
      certificateId: req.params.certId, playerId: cert.playerId,
      playerName: cert.playerName || "Unknown", authorityId: req.user!.uid,
      action: action === "approve" ? "approved" : "rejected",
      score: cert.score, wasInfected, healthChange,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    res.json({ success: true, approved: action === "approve", healthChange, winner });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
export default router;
