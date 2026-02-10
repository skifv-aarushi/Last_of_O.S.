import { Router } from "express";
import { db } from "../lib/firebase-admin";
import { requireAuth } from "../middleware/auth";
import admin from "firebase-admin";
 
const router = Router();
const PROBLEM_TYPES = ["aim", "typing", "memory", "inventory", "pid"];
 
function generateProblem(type: string) {
  const problems = {
    aim: { type: "aim", instruction: "Eliminate glitched targets.", timeLimit: 60 },
    typing: { type: "typing", instruction: "Type code sequences.", timeLimit: 60 },
    memory: { type: "memory", instruction: "Recall grid pattern.", timeLimit: 120 },
    inventory: { type: "inventory", instruction: "Identify registry items.", timeLimit: 60 },
    pid: { type: "pid", instruction: "Tune PID controller.", timeLimit: 240,
           targetValue: 50 + Math.random() * 50, tolerance: 5, minValue: 0, maxValue: 100 },
  };
  return problems[type] || { type, instruction: "Complete the task.", timeLimit: 60 };
}
 
// GET /api/session/:id/minigame - Assigns a random minigame
router.get("/:id/minigame", requireAuth, async (req, res) => {
  try {
    const playerRef = db.collection("sessions").doc(req.params.id)
      .collection("players").doc(req.user!.uid);
    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) { res.status(404).json({ error: "Player not found" }); return; }
    const pd = playerDoc.data()!;
    if (pd.cooldownUntil && pd.cooldownUntil.toDate() > new Date()) {
      res.status(403).json({ error: "Player is on cooldown" }); return;
    }
    const type = PROBLEM_TYPES[Math.floor(Math.random() * PROBLEM_TYPES.length)];
    const problem = generateProblem(type);
    const problemId = `${type}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    res.json({ success: true, problemId, problem: { ...problem, problemId: 0 },
      timeLimit: problem.timeLimit });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
// POST /api/session/:id/minigame/submit - Submit minigame score
router.post("/:id/minigame/submit", requireAuth, async (req, res) => {
  try {
    const { problemId, answer, infectionLevel } = req.body;
    if (!problemId || answer === undefined) {
      res.status(400).json({ error: "problemId and answer required" }); return;
    }
    const sessionRef = db.collection("sessions").doc(req.params.id);
    const playerDoc = await sessionRef.collection("players").doc(req.user!.uid).get();
    if (!playerDoc.exists) { res.status(404).json({ error: "Player not found" }); return; }
    const pd = playerDoc.data()!;
    const score = Math.max(0, Math.min(100, Number(answer)));
    const certRef = sessionRef.collection("certificates").doc();
    await certRef.set({
      playerId: req.user!.uid, playerName: pd.displayName || "Unknown",
      problemType: problemId.split("_")[0], problemId, score, answer,
      infectionLevel: infectionLevel || "none", status: "pending",
      authorityId: null, healthChange: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), processedAt: null,
    });
    const gameType = problemId.split("_")[0];
    await sessionRef.collection("players").doc(req.user!.uid).update({
      gamesPlayed: admin.firestore.FieldValue.arrayUnion(gameType),
    });
    res.json({ success: true, certificateId: certRef.id, score, bufferTime: 30 });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
 
export default router;
