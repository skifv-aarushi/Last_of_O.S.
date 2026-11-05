import { useEffect, useState } from "react";
import type { GameState } from "@/lib/api";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Round timer, cooldown status and admin announcements, shown on every map. */
export default function GameBanner({ state, accent = "#6ec4e5" }: { state: GameState | null; accent?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!state) return null;

  const now = Date.now();
  const bits: string[] = [`ROUND ${state.currentRound}/${state.totalRounds}`];
  if (state.roundEndsAt > now) bits.push(`${fmt(state.roundEndsAt - now)} LEFT`);
  if (state.cooldownUntil > now) bits.push(`COOLDOWN ${fmt(state.cooldownUntil - now)}`);
  else if (state.nextGameAt > now) bits.push(`NEXT TASK ${fmt(state.nextGameAt - now)}`);

  return (
    <div className="absolute z-40 top-[6px] left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
      <div
        className="font-pixel text-[10px] sm:text-xs px-3 py-1 bg-black/70 border"
        style={{ color: accent, borderColor: `${accent}66` }}
      >
        {bits.join("  |  ")}
      </div>
      {state.announcement && (
        <div className="font-pixel text-[10px] sm:text-xs px-3 py-1 bg-yellow-400/90 text-black border border-yellow-200 max-w-[90vw] text-center">
          {state.announcement}
        </div>
      )}
    </div>
  );
}
