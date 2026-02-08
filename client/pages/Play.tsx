import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CivilianCharacter from "@/components/CivilianCharacter";
import HealthBar from "@/components/HealthBar";
import { useGameState } from "@/hooks/use-game-state";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import { refreshToken } from "@/lib/firebase";

const labScene = "/lab-scene.png";

const ALL_GAMES = ["/aim-trainer", "/typing-test", "/visual-memory", "/inventory-management", "/pid-tuning"];

export default function Play() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Random game selection with no repeats
  const handlePortalEnter = useCallback(() => {
    const playedRaw = localStorage.getItem("playedGames");
    let played: string[] = playedRaw ? JSON.parse(playedRaw) : [];

    // Filter out already-played games
    let available = ALL_GAMES.filter((g) => !played.includes(g));

    // If all played, reset the pool
    if (available.length === 0) {
      played = [];
      available = [...ALL_GAMES];
    }

    // Pick random from available
    const chosen = available[Math.floor(Math.random() * available.length)];
    played.push(chosen);
    localStorage.setItem("playedGames", JSON.stringify(played));
    navigate(chosen);
  }, [navigate]);

  // Auth guard – redirect to login if not signed in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) navigate("/game");
    });
    return unsub;
  }, [navigate]);

  // Refresh token every 50 minutes (tokens expire in 60 min)
  useEffect(() => {
    const interval = setInterval(() => refreshToken(), 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);



  // Read session from localStorage (set after login/join)
  const sessionId = localStorage.getItem("sessionId");
  const { state } = useGameState(sessionId);

  // --- TEST: auto-decrease health every 5 seconds ---
  const [testHealth, setTestHealth] = useState(1000);
  useEffect(() => {
    const interval = setInterval(() => {
      setTestHealth((prev) => Math.max(0, prev - 100));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const health = testHealth;

  // WASD hint – show briefly then fade
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#1f2227] flex items-center justify-center">
        <span className="font-pixel text-sm text-pixel-cyan animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1f2227] flex flex-col">
      {/* Top status bar – health (full width, above everything) */}
      <div className="relative z-20 w-full shrink-0 h-[40px] sm:h-[48px] px-2 pt-2">
        <HealthBar
          value={health}
          total={1000}
          label={`SYSTEM HEALTH ${Math.round((health / 1000) * 100)}%`}
          className="h-full"
        />
      </div>

      {/* Game area (below health bar) */}
      <div className="relative flex-1">
        <img
          src={labScene}
          alt="Lab scene"
          className="absolute inset-0 h-full w-full object-cover pixelated"
        />

        {/* Civilian character – move with W A S D */}
        <CivilianCharacter onPortalEnter={handlePortalEnter} />

        {/* WASD controls hint */}
        {showHint && (
          <div className="absolute z-30 inset-0 flex items-center justify-center pointer-events-none animate-fade-out">
            <div className="bg-black/70 border border-pixel-cyan/50 px-6 py-4 flex flex-col items-center gap-2">
              <div className="flex gap-1">
                <span className="font-pixel text-sm text-pixel-cyan border border-pixel-cyan/40 bg-pixel-cyan/10 w-8 h-8 flex items-center justify-center">W</span>
              </div>
              <div className="flex gap-1">
                <span className="font-pixel text-sm text-pixel-cyan border border-pixel-cyan/40 bg-pixel-cyan/10 w-8 h-8 flex items-center justify-center">A</span>
                <span className="font-pixel text-sm text-pixel-cyan border border-pixel-cyan/40 bg-pixel-cyan/10 w-8 h-8 flex items-center justify-center">S</span>
                <span className="font-pixel text-sm text-pixel-cyan border border-pixel-cyan/40 bg-pixel-cyan/10 w-8 h-8 flex items-center justify-center">D</span>
              </div>
              <span className="font-pixel text-[10px] text-gray-400 mt-1">USE KEYS TO MOVE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
