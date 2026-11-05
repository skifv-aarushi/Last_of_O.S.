import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "@/lib/auth";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api";
import { useGameState } from "@/hooks/use-game-state";

const ROLE_COLOR: Record<string, string> = {
  citizen: "#6ec4e5", attacker: "#f97316", authority: "#00ff00", auditor: "#a855f7",
};

/** End-of-game screen: winner, the player's own result and the final standings. */
export default function Results() {
  const navigate = useNavigate();
  const sessionId = localStorage.getItem("sessionId");
  const { state } = useGameState(sessionId);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (!u) navigate("/game", { replace: true }); });
    return unsub;
  }, [navigate]);

  useEffect(() => {
    if (!sessionId) { navigate("/lobby", { replace: true }); return; }
    getLeaderboard(sessionId).then((r) => setBoard(r.leaderboard)).catch(console.error);
  }, [sessionId, navigate, state?.status]);

  // game still running (or not started): the guard on the map pages routes people correctly
  useEffect(() => {
    if (state && state.status !== "completed") navigate("/lobby", { replace: true });
  }, [state, navigate]);

  const winner = state?.winner;
  const headline = !winner
    ? "GAME OVER"
    : winner === "citizen" ? "THE SYSTEM SURVIVED" : "THE SYSTEM HAS FALLEN";

  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-black/60 border-2 border-pixel-cyan p-6 sm:p-8">
        <h1 className="font-tiny text-3xl sm:text-4xl text-pixel-cream text-center mb-2">{headline}</h1>
        <p className="font-pixel text-xs text-center text-pixel-cyan mb-6">
          {winner ? `${winner.toUpperCase()}S WIN` : "NO WINNER DECLARED"} - FINAL SYSTEM HEALTH {Math.round(state?.globalHealth ?? 0)}%
        </p>

        {state?.playerRole && (
          <p className="font-pixel text-xs text-white text-center mb-6">
            YOU WERE A <span style={{ color: ROLE_COLOR[state.playerRole] }}>{state.playerRole.toUpperCase()}</span>
            {" "}WITH {state.playerTrustScore} TRUST
          </p>
        )}

        <h2 className="font-pixel text-sm text-white mb-3">STANDINGS</h2>
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {board.slice(0, 50).map((p, i) => (
            <div key={p.playerId} className="flex items-center justify-between font-pixel text-xs text-white bg-white/5 px-3 py-2">
              <span>{i + 1}. {p.name}</span>
              <span>
                <span style={{ color: ROLE_COLOR[p.role ?? ""] }}>{p.role?.toUpperCase()}</span> - {p.trustScore}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { localStorage.removeItem("sessionId"); navigate("/lobby", { replace: true }); }}
          className="mt-6 w-full py-3 border-2 border-pixel-cyan text-pixel-cyan font-pixel text-sm hover:bg-pixel-cyan/20"
        >
          JOIN NEXT GAME
        </button>
      </div>
    </div>
  );
}
