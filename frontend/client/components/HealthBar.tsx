import { useEffect, useRef, useState, useCallback } from "react";

interface HealthBarProps {
  /** Current health value */
  value: number;
  /** Maximum health (default 1000) */
  total?: number;
  /** Optional label centred on the bar */
  label?: string;
  className?: string;
  /** Health fill colour (default "#2B7C57") */
  fillColor?: string;
  /** Empty/background colour (default "#26314E") */
  emptyColor?: string;
  /** Outer border colour (default "#4B546E") */
  borderColor?: string;
}

/**
 * Retro health bar with Neverwinter-style white hit flash.
 *
 * When health drops the lost portion flashes white, then after 500ms
 * the white segment collapses and the coloured bar shrinks to the new width.
 *
 * Direct TypeScript port of the jQuery/CSS reference.
 */
export default function HealthBar({
  value,
  total = 1000,
  label,
  className = "",
  fillColor = "#2B7C57",
  emptyColor = "#26314E",
  borderColor = "#4B546E",
}: HealthBarProps) {
  const prevValue = useRef(value);
  // barWidth = the visible coloured bar width (%)
  const [barWidth, setBarWidth] = useState(() => Math.max(0, (value / total) * 100));
  // hitWidth = the white flash segment inside the bar (% of bar, absolutely positioned right)
  const [hitWidth, setHitWidth] = useState("0px");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyDamage = useCallback(
    (prev: number, next: number) => {
      if (next >= prev) {
        // Heal or no change — snap immediately
        setHitWidth("0px");
        setBarWidth(Math.max(0, (next / total) * 100));
        return;
      }

      if (prev <= 0) return; // already dead

      const damage = prev - next;
      // hitWidth as a percentage of the OLD bar width (positioned inside .bar)
      const hitPct = (damage / prev) * 100 + "%";

      // 1. Show the white flash immediately
      setHitWidth(hitPct);

      // 2. After 500ms collapse the flash and shrink the bar
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setHitWidth("0px");
        setBarWidth(Math.max(0, (next / total) * 100));
      }, 500);
    },
    [total],
  );

  useEffect(() => {
    const prev = prevValue.current;
    prevValue.current = value;
    applyDamage(prev, value);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, applyDamage]);

  const isDead = value <= 0;

  return (
    <div
      className={`health-bar-container relative w-full select-none ${className}`}
      style={{
        padding: "4px",
        background: borderColor,
        borderRadius: "5px",
        boxSizing: "border-box",
      }}
    >
     {/* Inner background (visible when health is lost) */}
     <div
       style={{
         position: "absolute",
         inset: "4px",
         background: emptyColor,
         borderRadius: "2px",
       }}
     />
      {/* Coloured bar */}
      <div
        className="health-bar-fill"
        style={{
          background: isDead ? "#555" : fillColor,
          width: `${barWidth}%`,
          height: "100%",
          position: "relative",
          transition: "width 0.5s linear",
          borderRadius: "2px",
        }}
      >
        {/* White hit flash — absolutely positioned on the right of the bar */}
        <div
          className="health-bar-hit"
          style={{
            background: "rgba(255,255,255,0.6)",
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: hitWidth,
            transition: "width 0.5s linear",
          }}
        />
      </div>

      {/* Centred label */}
      {label && (
        <span
          className="absolute inset-0 flex items-center justify-center font-pixel text-[10px] sm:text-xs tracking-wider uppercase pointer-events-none"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
