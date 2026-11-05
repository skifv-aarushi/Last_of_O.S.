import { useEffect, useState } from "react";
import type { GameState } from "@/lib/api";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Round timer, personal cooldowns and admin announcements.
 * Maps use the default layout (announcement below the health bar); work screens pass `compact`.
 */
export default function GameBanner({
  state, accent = "#6ec4e5", compact = false,
}: { state: GameState | null; accent?: string; compact?: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!state || state.status !== "active") return null;

  const now = Date.now();
  const bits: string[] = [`ROUND ${state.currentRound}/${state.totalRounds}`];
  if (state.roundEndsAt > now) bits.push(`${fmt(state.roundEndsAt - now)} LEFT`);
  if (state.cooldownUntil > now) bits.push(`COOLDOWN ${fmt(state.cooldownUntil - now)}`);
  else if (state.nextGameAt > now) bits.push(`NEXT TASK ${fmt(state.nextGameAt - now)}`);
  if (state.playerRole === "auditor") {
    bits.push(state.abilityCooldownUntil > now ? `ABILITY ${fmt(state.abilityCooldownUntil - now)}` : "ABILITY READY");
  }
  const onCooldown = state.cooldownUntil > now;

  return (
    <>
      <div className="absolute z-40 top-[6px] left-0 right-0 flex justify-center pointer-events-none px-2">
        <div
          className="font-pixel text-[9px] sm:text-xs px-3 py-1 bg-black/75 border text-center"
          style={{ color: onCooldown ? "#f87171" : accent, borderColor: `${onCooldown ? "#f87171" : accent}66` }}
        >
          {bits.join("  |  ")}
        </div>
      </div>
      {state.announcement && (
        <div
          className={`absolute z-40 left-0 right-0 flex justify-center pointer-events-none px-3 ${
            compact ? "top-[36px]" : "top-[108px] sm:top-[112px]"
          }`}
        >
          <div className="font-pixel text-[9px] sm:text-xs px-3 py-1 bg-yellow-400/90 text-black border border-yellow-200 max-w-[90vw] text-center">
            {state.announcement}
          </div>
        </div>
      )}
    </>
  );
}
