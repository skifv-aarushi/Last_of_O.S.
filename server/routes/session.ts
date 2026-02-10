import { Router } from "express";
import { db } from "../lib/firebase-admin";
import { requireAuth } from "../middleware/auth";
import admin from "firebase-admin";
 
const router = Router();
 
// POST /api/session/create - Creates a new game session
router.post("/create", requireAuth, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const sessionRef = db.collection("sessions").doc();
    const sessionData = {
      status: "waiting", currentRound: 0, globalHealth: 100,
      medianScore: 0, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      hostUid: uid, totalRounds: 5, winner: null,
    };
    await sessionRef.set(sessionData);
    await sessionRef.collection("players").doc(uid).set({
      displayName: req.body.displayName || "Host",
      email: req.user!.email, role: "citizen", trustScore: 50,
      cooldownUntil: null,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(), gamesPlayed: [],
    });
    res.json({ success: true, sessionId: sessionRef.id,
      session: { id: sessionRef.id, ...sessionData, createdAt: Date.now() } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// POST /api/session/:id/join - Join an existing session
router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const sessionRef = db.collection("sessions").doc(req.params.id);
    const session = await sessionRef.get();
    if (!session.exists) { res.status(404).json({ error: "Session not found" }); return; }
    if (session.data()!.status !== "waiting") {
      res.status(400).json({ error: "Session already started" }); return;
    }
    await sessionRef.collection("players").doc(req.user!.uid).set({
      displayName: req.body.displayName || "Player",
      email: req.user!.email, role: "citizen", trustScore: 50,
      cooldownUntil: null,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(), gamesPlayed: [],
    });
    const playersSnap = await sessionRef.collection("players").get();
    res.json({ success: true, playerCount: playersSnap.size });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// POST /api/session/:id/start - Host starts game, assigns roles
router.post("/:id/start", requireAuth, async (req, res) => {
  try {
    const sessionRef = db.collection("sessions").doc(req.params.id);
    const session = await sessionRef.get();
    if (!session.exists) { res.status(404).json({ error: "Session not found" }); return; }
    if (session.data()!.hostUid !== req.user!.uid) {
      res.status(403).json({ error: "Only the host can start" }); return;
    }
    const playersSnap = await sessionRef.collection("players").get();
    const playerIds = playersSnap.docs.map(d => d.id);
    if (playerIds.length < 4) {
      res.status(400).json({ error: "Need at least 4 players" }); return;
    }
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    const roles = {}; const batch = db.batch();
    shuffled.forEach((id, i) => {
      const role = i === 0 ? "attacker" : i === 1 ? "authority"
        : i === 2 ? "auditor" : "citizen";
      roles[id] = role;
      batch.update(sessionRef.collection("players").doc(id), { role });
    });
    batch.update(sessionRef, { status: "active", currentRound: 1 });
    await batch.commit();
    res.json({ success: true, roles });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// POST /api/session/:id/nextRound - Advance to next round
router.post("/:id/nextRound", requireAuth, async (req, res) => {
  try {
    const sessionRef = db.collection("sessions").doc(req.params.id);
    const session = await sessionRef.get();
    if (!session.exists) { res.status(404).json({ error: "Session not found" }); return; }
    const data = session.data()!;
    const nextRound = data.currentRound + 1;
    if (data.globalHealth <= 0) {
      await sessionRef.update({ status: "completed", winner: "attacker" });
      res.json({ success: true, gameOver: true, winner: "attacker" }); return;
    }
    if (nextRound > data.totalRounds) {
      await sessionRef.update({ status: "completed", winner: "citizen" });
      res.json({ success: true, gameOver: true, winner: "citizen" }); return;
    }
    await sessionRef.update({ currentRound: nextRound });
    res.json({ success: true, gameOver: false, newRound: nextRound });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// GET /api/session/:id/state - Current game state for calling player
router.get("/:id/state", requireAuth, async (req, res) => {
  try {
    const sessionRef = db.collection("sessions").doc(req.params.id);
    const [session, playerDoc, playersSnap] = await Promise.all([
      sessionRef.get(),
      sessionRef.collection("players").doc(req.user!.uid).get(),
      sessionRef.collection("players").get(),
    ]);
    if (!session.exists) { res.status(404).json({ error: "Session not found" }); return; }
    const data = session.data()!;
    const pd = playerDoc.exists ? playerDoc.data()! : null;
    res.json({
      success: true, globalHealth: data.globalHealth,
      currentRound: data.currentRound, status: data.status,
      winner: data.winner ?? undefined,
      playerRole: pd?.role ?? "citizen",
      playerTrustScore: pd?.trustScore ?? 50,
      cooldownUntil: pd?.cooldownUntil?.toMillis?.() ?? 0,
      totalPlayers: playersSnap.size,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// GET /api/session/:id/leaderboard
router.get("/:id/leaderboard", requireAuth, async (req, res) => {
  try {
    const sessionRef = db.collection("sessions").doc(req.params.id);
    const snap = await sessionRef.collection("players")
      .orderBy("trustScore", "desc").get();
    const leaderboard = snap.docs.map(doc => ({
      playerId: doc.id, trustScore: doc.data().trustScore, role: doc.data().role,
    }));
    res.json({ success: true, leaderboard });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
export default router;
