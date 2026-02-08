import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HealthBar from "@/components/HealthBar";

const TOTAL = 1000;

export default function HealthBarDemo() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(TOTAL);
  const [log, setLog] = useState<string[]>(["What's going on..."]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
  }, []);

  const handleHit = useCallback(() => {
    setHealth((prev) => {
      if (prev <= 0) {
        addLog("You're dead! Reset first.");
        return prev;
      }

      // Random damage up to full total (matching jQuery: Math.floor(Math.random()*total))
      const damage = Math.floor(Math.random() * TOTAL);
      const newValue = prev - damage;
      const hitWidthPct = ((damage / prev) * 100).toFixed(1) + "%";

      addLog(`H:${prev}  D:${damage}  W:${hitWidthPct}  = ${newValue}`);

      if (newValue <= 0) {
        addLog("DEAD");
      }

      return Math.max(0, newValue);
    });
  }, [addLog]);

  const handleReset = useCallback(() => {
    setHealth(TOTAL);
    addLog(`Resetting health to ${TOTAL}`);
  }, [addLog]);

  const healthPct = Math.max(0, Math.round((health / TOTAL) * 100));
  const isDead = health <= 0;

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-start p-8 gap-8 font-pixel">
      {/* Title */}
      <h1 className="text-2xl text-white tracking-widest uppercase">
        Health Bar Demo
      </h1>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors"
      >
        &larr; Back
      </button>

      {/* Health bar — full width demo */}
      <div className="w-full max-w-2xl">
        <HealthBar
          value={health}
          total={TOTAL}
          label={isDead ? "DEAD" : `SYSTEM HEALTH ${healthPct}%`}
          className="h-8"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-8 text-sm text-gray-400">
        <span>HP: <span className={isDead ? "text-red-500" : "text-green-400"}>{health}</span> / {TOTAL}</span>
        <span>({healthPct}%)</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleHit}
          disabled={isDead}
          className="px-6 py-2 bg-[#c54] hover:bg-[#d65] disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm uppercase tracking-wider rounded transition-colors"
        >
          Hit Random
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-[#2a3548] hover:bg-[#3a4558] text-white text-sm uppercase tracking-wider rounded transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Pre-set damage buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        {[50, 100, 200, 500].map((dmg) => (
          <button
            key={dmg}
            disabled={isDead}
            onClick={() => {
              setHealth((prev) => {
                if (prev <= 0) return prev;
                const newVal = Math.max(0, prev - dmg);
                addLog(`H:${prev}  D:${dmg}  = ${newVal}`);
                if (newVal <= 0) addLog("DEAD");
                return newVal;
              });
            }}
            className="px-4 py-1.5 bg-[#333] hover:bg-[#444] disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs uppercase tracking-wider rounded transition-colors"
          >
            -{dmg}
          </button>
        ))}
        <button
          disabled={isDead}
          onClick={() => {
            setHealth((prev) => {
              if (prev >= TOTAL) return prev;
              const newVal = Math.min(TOTAL, prev + 200);
              addLog(`Healed +200  → ${newVal}`);
              return newVal;
            });
          }}
          className="px-4 py-1.5 bg-[#2B7C57] hover:bg-[#3a9c6a] disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs uppercase tracking-wider rounded transition-colors"
        >
          +200 Heal
        </button>
      </div>

      {/* Log */}
      <div className="w-full max-w-2xl bg-[#1a1a1a] border border-gray-800 rounded p-4 max-h-60 overflow-y-auto">
        <div className="text-xs text-gray-500 space-y-0.5">
          {log.map((entry, i) => (
            <div key={i} className={i === log.length - 1 ? "text-gray-300" : ""}>
              {entry}
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="w-full max-w-2xl text-xs text-gray-600 space-y-1 leading-relaxed">
        <p>
          <span className="text-gray-400">Hit animation:</span> On damage, the
          lost portion flashes <span className="text-white/70">white</span> for
          500ms (positioned at the right edge of the bar), then the white
          segment collapses and the red bar shrinks to its new width.
        </p>
        <p>
          <span className="text-gray-400">Transitions:</span> Both the bar
          width and the hit flash use <code className="text-gray-400">transition: width 0.5s linear</code>,
          matching the original jQuery/CSS implementation.
        </p>
      </div>
    </div>
  );
}
