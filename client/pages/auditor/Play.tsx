import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AuditorCharacter from "@/components/AuditorCharacter";
import HealthBar from "@/components/HealthBar";
import { useGameState } from "@/hooks/use-game-state";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import { refreshToken } from "@/lib/firebase";

const mapScene = "/auditor-map.png";

export default function AuditorPlay() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ─── Zone navigation handlers ───

  // Task Bay – navigate to auditor game page
  const handlePortalEnter = useCallback(() => {
    navigate("/auditor/game");
  }, [navigate]);

  // User Info machine
  const handleUserInfoEnter = useCallback(() => {
    navigate("/auditor/user-info");
  }, [navigate]);

  // Personal Stats machine
  const handlePersonalStatsEnter = useCallback(() => {
    navigate("/auditor/personal-stats");
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
      <div className="min-h-screen w-full bg-[#0a0e17] flex items-center justify-center">
        <span className="font-pixel text-sm text-[#a855f7] animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0e17]">
      {/* Full-screen background */}
      <img
        src={mapScene}
        alt="Auditor map"
        className="absolute inset-0 h-full w-full object-fill pixelated"
      />

      {/* Health bar – overlaid on top of background */}
      <div className="absolute z-30 top-[40px] sm:top-[50px] left-[20px] sm:left-[40px] right-[20px] sm:right-[40px] h-[40px] sm:h-[48px] px-2">
        <HealthBar
          value={health}
          total={1000}
          label={`SYSTEM HEALTH ${Math.round((health / 1000) * 100)}%`}
          className="h-full"
          fillColor="#4667D0"
          emptyColor="#323D30"
          borderColor="#0F2F13"
        />
      </div>

      {/* Game area (full viewport, character + hints) */}
      <div className="relative w-full h-screen">

        {/* Auditor character – move with W A S D */}
        <AuditorCharacter
          onPortalEnter={handlePortalEnter}
          onUserInfoEnter={handleUserInfoEnter}
          onPersonalStatsEnter={handlePersonalStatsEnter}
        />

        {/* WASD controls hint */}
        {showHint && (
          <div className="absolute z-30 inset-0 flex items-center justify-center pointer-events-none animate-fade-out">
            <div className="bg-black/70 border border-[#a855f7]/50 px-6 py-4 flex flex-col items-center gap-2">
              <div className="flex gap-1">
                <span className="font-pixel text-sm text-[#a855f7] border border-[#a855f7]/40 bg-[#a855f7]/10 w-8 h-8 flex items-center justify-center">W</span>
              </div>
              <div className="flex gap-1">
                <span className="font-pixel text-sm text-[#a855f7] border border-[#a855f7]/40 bg-[#a855f7]/10 w-8 h-8 flex items-center justify-center">A</span>
                <span className="font-pixel text-sm text-[#a855f7] border border-[#a855f7]/40 bg-[#a855f7]/10 w-8 h-8 flex items-center justify-center">S</span>
                <span className="font-pixel text-sm text-[#a855f7] border border-[#a855f7]/40 bg-[#a855f7]/10 w-8 h-8 flex items-center justify-center">D</span>
              </div>
              <span className="font-pixel text-[10px] text-gray-400 mt-1">USE KEYS TO MOVE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
