import { Router } from "express";
import { db, newId } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { CONFIG, getPlayer, getSession, randomBuffer, tick } from "../_lib/game.js";

const router = Router();
const PROBLEM_TYPES = ["aim", "typing", "memory", "inventory", "pid"];

function generateProblem(type: string) {
  const problems: Record<string, any> = {
    aim: { type: "aim", instruction: "Eliminate glitched targets.", timeLimit: 60 },
    typing: { type: "typing", instruction: "Type code sequences.", timeLimit: 60 },
    memory: { type: "memory", instruction: "Recall grid pattern.", timeLimit: 120 },
    inventory: { type: "inventory", instruction: "Identify registry items.", timeLimit: 60 },
    pid: { type: "pid", instruction: "Tune PID controller.", timeLimit: 240,
           targetValue: 50 + Math.random() * 50, tolerance: 5, minValue: 0, maxValue: 100 },
  };
  return problems[type] || { type, instruction: "Complete the task.", timeLimit: 60 };
}

/** Shared gate for starting/submitting tasks: game running, task-capable role, not on cooldown. */
async function gate(sessionId: string, uid: string) {
  const session = await getSession(sessionId);
  if (!session) return { status: 404, error: "Session not found" } as const;
  const live = await tick(session);
  if (live.status !== "active") return { status: 400, error: "The game is not running" } as const;
  const player = await getPlayer(sessionId, uid);
  if (!player) return { status: 404, error: "Player not found" } as const;
  if (player.role !== "citizen" && player.role !== "attacker") {
    return { status: 403, error: "Your role does not run tasks" } as const;
  }
  const now = Date.now();
  if (Number(player.cooldown_until ?? 0) > now) {
    return { status: 429, error: `On cooldown: ${Math.ceil((Number(player.cooldown_until) - now) / 1000)}s` } as const;
  }
  return { player, now } as const;
}

// GET /api/session/:id/minigame - Assigns a random minigame
router.get("/:id/minigame", requireAuth, async (req, res) => {
  try {
    const g = await gate(String(req.params.id), req.user!.uid);
    if ("error" in g) { res.status(g.status).json({ error: g.error }); return; }
    if (Number(g.player.next_game_at ?? 0) > g.now) {
      res.status(429).json({ error: `Buffer time: ${Math.ceil((Number(g.player.next_game_at) - g.now) / 1000)}s` });
      return;
    }
    const type = PROBLEM_TYPES[Math.floor(Math.random() * PROBLEM_TYPES.length)];
    const problem = generateProblem(type);
    const problemId = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    res.json({ success: true, problemId, problem: { ...problem, problemId: 0 }, timeLimit: problem.timeLimit });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/session/:id/minigame/submit - Submit minigame score
router.post("/:id/minigame/submit", requireAuth, async (req, res) => {
  try {
    const { problemId, answer, infectionLevel } = req.body ?? {};
    const numeric = Number(answer);
    if (!problemId || answer === undefined || !Number.isFinite(numeric)) {
      res.status(400).json({ error: "problemId and a numeric answer are required" }); return;
    }
    const sid = String(req.params.id);
    const uid = req.user!.uid;
    const g = await gate(sid, uid);
    if ("error" in g) { res.status(g.status).json({ error: g.error }); return; }
    const { player, now } = g;
    // a real task takes far longer than the buffer, so this only stops scripted spam
    if (Number(player.next_game_at ?? 0) > now) {
      res.status(429).json({ error: "Submitting too fast" }); return;
    }

    const gameType = String(problemId).split("_")[0];
    if (!PROBLEM_TYPES.includes(gameType)) { res.status(400).json({ error: "Unknown game type" }); return; }

    // Only attackers can infect; the penalty makes infected certificates slightly less convincing
    let level: "none" | "minor" | "major" = "none";
    if (player.role === "attacker" && (infectionLevel === "minor" || infectionLevel === "major")) level = infectionLevel;
    const penalty = level === "minor" ? CONFIG.MINOR_INFECTION_PENALTY : level === "major" ? CONFIG.MAJOR_INFECTION_PENALTY : 0;
    const score = Math.max(0, Math.min(100, Math.round(numeric)) - penalty);

    const played: string[] = JSON.parse(String(player.games_played));
    if (!played.includes(gameType)) played.push(gameType);
    const certId = newId();
    const buffer = randomBuffer();
    try {
      await db.batch([
        {
          sql: `INSERT INTO certificates (id, session_id, player_id, player_name, problem_type, problem_id,
                  score, answer, infection_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [certId, sid, uid, String(player.display_name ?? "Unknown"), gameType,
                 String(problemId), score, numeric, level, now],
        },
        {
          sql: "UPDATE players SET games_played = ?, next_game_at = ? WHERE session_id = ? AND player_id = ?",
          args: [JSON.stringify(played), now + buffer, sid, uid],
        },
      ], "write");
    } catch (e: any) {
      if (String(e.message).includes("UNIQUE")) { res.status(409).json({ error: "Already submitted" }); return; }
      throw e;
    }
    res.json({ success: true, certificateId: certId, score, bufferTime: buffer });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
