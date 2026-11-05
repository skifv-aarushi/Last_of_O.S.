import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "@/lib/auth";
import { getLeaderboard, type LeaderboardEntry, type Role } from "@/lib/api";
import { useGameState } from "@/hooks/use-game-state";
import { PixelButton, PixelHeading, PixelPanel, ROLE_STYLE } from "@/components/pixel";

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

  // game still running (or not started): the lobby routes people correctly
  useEffect(() => {
    if (state && state.status !== "completed") navigate("/lobby", { replace: true });
  }, [state, navigate]);

  const winner = state?.winner;
  const won = winner === "citizen";
  const headline = !winner ? "GAME OVER" : won ? "THE SYSTEM SURVIVED" : "THE SYSTEM HAS FALLEN";
  const headColor = !winner ? "#ffffff" : won ? "#00e5ff" : "#f97316";
  const myRole = state?.playerRole as Role | null | undefined;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0e17]">
      <img src="/user-info-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-6">
        <h1 className="font-pixel text-xl sm:text-3xl text-center leading-relaxed" style={{ color: headColor }}>
          {headline}
        </h1>
        <p className="font-pixel text-[10px] sm:text-xs text-center text-white">
          {winner ? `${winner.toUpperCase()}S WIN` : "NO WINNER DECLARED"} - FINAL SYSTEM HEALTH{" "}
          <span className="text-pixel-cyan">{Math.round(state?.globalHealth ?? 0)}%</span>
        </p>

        <PixelPanel className="w-full max-w-xl p-6 sm:p-8">
          {myRole && (
            <p className="font-pixel text-xs text-white text-center mb-6 leading-relaxed">
              YOU WERE {/^[aeiou]/.test(myRole) ? "AN" : "A"} <span style={{ color: ROLE_STYLE[myRole].color }}>{myRole.toUpperCase()}</span>
              <br />
              TRUST SCORE <span className="text-pixel-cyan">{state?.playerTrustScore}</span>
            </p>
          )}

          <PixelHeading white="FINAL" accent="STANDINGS" className="mb-3" />
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {board.slice(0, 50).map((p, i) => {
              const color = ROLE_STYLE[(p.role ?? "citizen") as Role]?.color ?? "#fff";
              return (
                <div key={p.playerId} className="flex items-center justify-between font-jura text-sm bg-white/5 px-3 py-2 border-l-2" style={{ borderColor: color }}>
                  <span className="text-white truncate">{i + 1}. {p.name}</span>
                  <span className="shrink-0 ml-3">
                    <span className="font-pixel text-[9px]" style={{ color }}>{p.role?.toUpperCase()}</span>
                    <span className="text-gray-300"> - {p.trustScore}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </PixelPanel>

        <PixelButton onClick={() => { localStorage.removeItem("sessionId"); navigate("/lobby", { replace: true }); }}>
          JOIN NEXT GAME
        </PixelButton>
      </div>
    </div>
  );
}
