import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AuthorityCharacter from "@/components/AuthorityCharacter";
import HealthBar from "@/components/HealthBar";
import { useGameGuard, taskBlockedReason } from "@/hooks/use-game-guard";
import GameBanner from "@/components/GameBanner";
import { toast } from "sonner";

const mapScene = "/authority-map.png";

export default function AuthorityPlay() {
  const navigate = useNavigate();
  const { authLoading, state } = useGameGuard("authority");
  const health = state?.globalHealth ?? 100;

  // ─── Zone navigation handlers ───

  // Task Bay – navigate to authority game page
  const handlePortalEnter = useCallback(() => {
    navigate("/authority/game");
  }, [navigate]);

  // User Info machine
  const handleUserInfoEnter = useCallback(() => {
    navigate("/authority/user-info");
  }, [navigate]);

  // Personal Stats machine
  const handlePersonalStatsEnter = useCallback(() => {
    navigate("/authority/personal-stats");
  }, [navigate]);

  // WASD hint – show briefly then fade
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0a0e17] flex items-center justify-center">
        <span className="font-pixel text-sm text-[#00ff00] animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0e17]">
      {/* Full-screen background */}
      <img
        src={mapScene}
        alt="Authority map"
        className="absolute inset-0 h-full w-full object-fill pixelated"
      />

      {/* Health bar – overlaid on top of background */}
      <div className="absolute z-30 top-[40px] sm:top-[50px] left-[20px] sm:left-[40px] right-[20px] sm:right-[40px] h-[40px] sm:h-[48px] px-2">
        <HealthBar
          value={health}
          total={100}
          label={`SYSTEM HEALTH ${Math.round(health)}%`}
          className="h-full"
          fillColor="#4667D0"
          emptyColor="#323D30"
          borderColor="#0F2F13"
        />
      </div>

      <GameBanner state={state} accent="#00ff00" />

      {/* Game area (full viewport, character + hints) */}
      <div className="relative w-full h-screen">

        {/* Authority character – move with W A S D */}
        <AuthorityCharacter
          onPortalEnter={handlePortalEnter}
          onUserInfoEnter={handleUserInfoEnter}
          onPersonalStatsEnter={handlePersonalStatsEnter}
        />

        {/* WASD controls hint */}
        {showHint && (
          <div className="absolute z-30 inset-0 flex items-center justify-center pointer-events-none animate-fade-out">
            <div className="bg-black/70 border border-[#00ff00]/50 px-6 py-4 flex flex-col items-center gap-2">
              <div className="flex gap-1">
                <span className="font-pixel text-sm text-[#00ff00] border border-[#00ff00]/40 bg-[#00ff00]/10 w-8 h-8 flex items-center justify-center">W</span>
              </div>
              <div className="flex gap-1">
                <span className="font-pixel text-sm text-[#00ff00] border border-[#00ff00]/40 bg-[#00ff00]/10 w-8 h-8 flex items-center justify-center">A</span>
                <span className="font-pixel text-sm text-[#00ff00] border border-[#00ff00]/40 bg-[#00ff00]/10 w-8 h-8 flex items-center justify-center">S</span>
                <span className="font-pixel text-sm text-[#00ff00] border border-[#00ff00]/40 bg-[#00ff00]/10 w-8 h-8 flex items-center justify-center">D</span>
              </div>
              <span className="font-pixel text-[10px] text-gray-400 mt-1">USE KEYS TO MOVE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
