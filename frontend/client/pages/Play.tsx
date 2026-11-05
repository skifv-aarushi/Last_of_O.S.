import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CivilianCharacter from "@/components/CivilianCharacter";
import HealthBar from "@/components/HealthBar";
import { useGameGuard, taskBlockedReason } from "@/hooks/use-game-guard";
import GameBanner from "@/components/GameBanner";
import { toast } from "sonner";

const labScene = "/lab-scene.png";

const ALL_GAMES = ["/aim-trainer", "/typing-test", "/visual-memory", "/inventory-management", "/pid-tuning"];

export default function Play() {
  const navigate = useNavigate();
  const { authLoading, state } = useGameGuard("citizen");
  const health = state?.globalHealth ?? 100;

  // ─── Zone navigation handlers ───

  // Task Bay – random game selection with no repeats
  const handlePortalEnter = useCallback(() => {
    const blocked = taskBlockedReason(state);
    if (blocked) { toast.error(blocked); return; }
    const playedRaw = localStorage.getItem("playedGames");
    let played: string[] = playedRaw ? JSON.parse(playedRaw) : [];

    let available = ALL_GAMES.filter((g) => !played.includes(g));
    if (available.length === 0) {
      played = [];
      available = [...ALL_GAMES];
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    played.push(chosen);
    localStorage.setItem("playedGames", JSON.stringify(played));
    navigate(chosen);
  }, [navigate, state]);

  // User Info machine
  const handleUserInfoEnter = useCallback(() => {
    navigate("/user-info");
  }, [navigate]);

  // Personal Stats machine
  const handlePersonalStatsEnter = useCallback(() => {
    navigate("/personal-stats");
  }, [navigate]);

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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1f2227]">
      {/* Full-screen background */}
      <img
        src={labScene}
        alt="Lab scene"
        className="absolute inset-0 h-full w-full object-fill pixelated"
      />

      {/* Health bar – overlaid on top of background */}
      <div className="absolute z-30 top-[40px] sm:top-[50px] left-[20px] sm:left-[40px] right-[20px] sm:right-[40px] h-[40px] sm:h-[48px] px-2">
        <HealthBar
          value={health}
          total={100}
          label={`SYSTEM HEALTH ${Math.round(health)}%`}
          className="h-full"
        />
      </div>

      <GameBanner state={state} accent="#6ec4e5" />

      {/* Game area (full viewport, character + hints) */}
      <div className="relative w-full h-screen">

        {/* Civilian character – move with W A S D */}
        <CivilianCharacter
          onPortalEnter={handlePortalEnter}
          onUserInfoEnter={handleUserInfoEnter}
          onPersonalStatsEnter={handlePersonalStatsEnter}
        />

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
