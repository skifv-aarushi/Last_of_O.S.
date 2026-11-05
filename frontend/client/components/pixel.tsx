import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Role } from "@/lib/api";

/** Shared look for the non-map screens: dark panel, thin border, accent corner brackets. */

export const ROLE_STYLE: Record<Role, { color: string; sprite: string; blurb: string }> = {
  citizen: {
    color: "#00e5ff",
    sprite: "/citizen-sprite.png",
    blurb: "Complete tasks, keep the system alive, and trust nobody completely.",
  },
  attacker: {
    color: "#f97316",
    sprite: "/attacker-sprite1.png",
    blurb: "Slip infected certificates past the Authority and bring the system down.",
  },
  authority: {
    color: "#00ff00",
    sprite: "/authority-sprite1.png",
    blurb: "Inspect every certificate. Approve the clean, reject the infected.",
  },
  auditor: {
    color: "#a855f7",
    sprite: "/auditor-sprites1.png",
    blurb: "Watch the ledger, find the corrupt, and put suspects on cooldown.",
  },
};

export function PixelPanel({
  children, className = "", accent = "#00e5ff",
}: { children: ReactNode; className?: string; accent?: string }) {
  const corner = "absolute w-3 h-3";
  return (
    <div className={`relative border border-gray-600 bg-black/60 ${className}`}>
      <span className={`${corner} -top-[1px] -left-[1px] border-t border-l`} style={{ borderColor: accent }} />
      <span className={`${corner} -top-[1px] -right-[1px] border-t border-r`} style={{ borderColor: accent }} />
      <span className={`${corner} -bottom-[1px] -left-[1px] border-b border-l`} style={{ borderColor: accent }} />
      <span className={`${corner} -bottom-[1px] -right-[1px] border-b border-r`} style={{ borderColor: accent }} />
      {children}
    </div>
  );
}

/** "WAITING ROOM" style heading: white words with the highlighted word in the accent colour. */
export function PixelHeading({
  white, accent, color = "#00e5ff", className = "",
}: { white: string; accent: string; color?: string; className?: string }) {
  return (
    <h2 className={`font-pixel text-base sm:text-lg ${className}`}>
      <span className="text-white">{white} </span>
      <span style={{ color }}>{accent}</span>
    </h2>
  );
}

export function PixelButton({
  accent = "#00e5ff", className = "", children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { accent?: string }) {
  return (
    <button
      {...rest}
      className={`px-5 py-2 bg-black/50 border font-pixel text-[10px] sm:text-xs uppercase transition-colors
        hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ borderColor: `${accent}80`, color: accent }}
    >
      {children}
    </button>
  );
}
