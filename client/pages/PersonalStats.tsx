import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import { useGameState } from "@/hooks/use-game-state";

export default function PersonalStats() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) navigate("/game");
    });
    return unsub;
  }, [navigate]);

  const sessionId = localStorage.getItem("sessionId");
  const { state } = useGameState(sessionId);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center">
        <span className="font-pixel text-sm text-pixel-cyan animate-pulse">LOADING...</span>
      </div>
    );
  }

  // Games played from localStorage
  const playedRaw = localStorage.getItem("playedGames");
  const played: string[] = playedRaw ? JSON.parse(playedRaw) : [];

  const playerName = user?.displayName ?? localStorage.getItem("playerName") ?? "UNKNOWN";

  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-black/60 border-2 border-pixel-cyan p-6 sm:p-8">
        {/* Header */}
        <h1 className="font-pixel text-lg sm:text-xl text-pixel-cyan text-center mb-2">
          PERSONAL STATS
        </h1>
        <p className="font-pixel text-[10px] text-gray-400 text-center mb-6">
          {playerName}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatBox label="TRUST SCORE" value={state?.playerTrustScore?.toString() ?? "—"} />
          <StatBox label="GLOBAL HEALTH" value={state?.globalHealth?.toString() ?? "—"} />
          <StatBox label="CURRENT ROUND" value={state?.currentRound?.toString() ?? "—"} />
          <StatBox label="TOTAL PLAYERS" value={state?.totalPlayers?.toString() ?? "—"} />
          <StatBox label="ROLE" value={state?.playerRole?.toUpperCase() ?? "—"} />
          <StatBox label="STATUS" value={state?.status?.toUpperCase() ?? "—"} />
        </div>

        {/* Games played */}
        <div className="border-t border-pixel-cyan/20 pt-4 mb-6">
          <span className="font-pixel text-[10px] text-gray-400 block mb-2">
            GAMES COMPLETED ({played.length})
          </span>
          {played.length === 0 ? (
            <span className="font-pixel text-xs text-gray-500">NONE YET</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {played.map((g, i) => (
                <span
                  key={i}
                  className="font-pixel text-[10px] text-pixel-cream bg-pixel-cyan/10 border border-pixel-cyan/30 px-2 py-1"
                >
                  {g.replace("/", "").replace(/-/g, " ").toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate("/play")}
          className="w-full py-2 bg-transparent border-2 border-pixel-cyan text-pixel-cyan font-pixel text-xs sm:text-sm hover:bg-pixel-cyan/20 transition-colors uppercase"
        >
          BACK TO MAP
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/40 border border-pixel-cyan/20 p-3 flex flex-col items-center gap-1">
      <span className="font-pixel text-[9px] text-gray-400">{label}</span>
      <span className="font-pixel text-sm text-pixel-cyan">{value}</span>
    </div>
  );
}
