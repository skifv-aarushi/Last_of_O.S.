import { useEffect, useRef } from "react";

/**
 * Spritesheet: /civilian-spritesheet.png (853 × 1280)
 * Frames extracted from Figma node positions:
 *   walking1 : x≈25,  y≈6,   w≈224, h≈267
 *   walking2 : x≈230, y≈0,   w≈209, h≈270
 *   standing : x≈624, y≈0,   w≈217, h≈267
 */

const SPRITE = "/civilian-spritesheet.png";

const FRAMES = {
  standing: { x: 624, y: 0, w: 217, h: 267 },
  walk1: { x: 25, y: 6, w: 224, h: 267 },
  walk2: { x: 230, y: 0, w: 209, h: 270 },
} as const;

const CHAR_W = 96;
const CHAR_H = 120;
const MOVE_SPEED = 2.5;
const ANIM_INTERVAL = 200; // ms per walk frame

// Character hitbox in % (smaller than sprite for forgiving feel)
const HB_W = 3; // % of viewport width
const HB_H = 4; // % of viewport height

// Spawn point – between User Info and Personal Stats machines
const SPAWN = { x: 49.3, y: 37.7 };

/**
 * Zones mapped from Figma image-map (1440×1024 → viewport %).
 * Interactive zones trigger navigation; obstacles just block movement.
 */

// ─── Interactive zones (collision + navigation trigger) ───
const ZONE_USER_INFO = { x1: 11.2, y1: 18.7, x2: 34.8, y2: 40.7 };
const ZONE_PERSONAL_STATS = { x1: 63.8, y1: 19.1, x2: 89.2, y2: 42.8 };

// Task Bay portal – circle → ellipse in viewport %
const PORTAL = { cx: 49.7, cy: 56.9, rx: 9.9, ry: 13.9 };

// ─── Pure obstacles (block movement, no navigation) ───
const RECT_OBSTACLES = [
  // Top wall / ceiling (above machines)
  { x1: 0, y1: 0, x2: 100, y2: 18.7 },
  // Left wall (beside User Info machine)
  { x1: 0, y1: 18.7, x2: 11.2, y2: 56 },
  // Right wall (beside Personal Stats machine)
  { x1: 89.2, y1: 18.7, x2: 100, y2: 56 },
  // Obstacle 1 – left battery panels (Figma)
  { x1: 9.0, y1: 55.9, x2: 24.7, y2: 69.2 },
  // Obstacle 2 – right battery panels (Figma)
  { x1: 75.1, y1: 56.2, x2: 90.7, y2: 70.8 },
  // Bottom-left pipes
  { x1: 0, y1: 80, x2: 12, y2: 100 },
  // Bottom-right pipes
  { x1: 72, y1: 88, x2: 100, y2: 100 },
  // Bottom edge
  { x1: 0, y1: 97, x2: 100, y2: 100 },
];

// ─── Collision helpers ───

type Rect = { x1: number; y1: number; x2: number; y2: number };

function hitsRect(cx: number, cy: number, r: Rect): boolean {
  const hw = HB_W / 2;
  const hh = HB_H / 2;
  return cx + hw > r.x1 && cx - hw < r.x2 && cy + hh > r.y1 && cy - hh < r.y2;
}

function collidesObstacle(cx: number, cy: number): boolean {
  for (const ob of RECT_OBSTACLES) {
    if (hitsRect(cx, cy, ob)) return true;
  }
  return false;
}

function insidePortal(cx: number, cy: number): boolean {
  const hw = HB_W / 2;
  const hh = HB_H / 2;
  const edx = (cx - PORTAL.cx) / (PORTAL.rx + hw);
  const edy = (cy - PORTAL.cy) / (PORTAL.ry + hh);
  return edx * edx + edy * edy < 1;
}

/** Returns true if pos is inside any interactive / portal zone */
function collidesInteractive(cx: number, cy: number): boolean {
  return (
    hitsRect(cx, cy, ZONE_USER_INFO) ||
    hitsRect(cx, cy, ZONE_PERSONAL_STATS) ||
    insidePortal(cx, cy)
  );
}

type Direction = "left" | "right";

interface Props {
  onPortalEnter?: () => void;
  onUserInfoEnter?: () => void;
  onPersonalStatsEnter?: () => void;
}

/**
 * Performance-optimised civilian character.
 * All per-frame state lives in refs; the DOM is updated directly
 * inside requestAnimationFrame so React never re-renders during movement.
 */
export default function CivilianCharacter({
  onPortalEnter,
  onUserInfoEnter,
  onPersonalStatsEnter,
}: Props) {
  // DOM refs
  const charRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);

  // Mutable state (never triggers re-render)
  const posRef = useRef({ x: SPAWN.x, y: SPAWN.y });
  const facingRef = useRef<Direction>("right");
  const isMovingRef = useRef(false);
  const walkFrameRef = useRef(0);
  const lastAnimRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());

  // One-shot trigger guards
  const portalTriggeredRef = useRef(false);
  const userInfoTriggeredRef = useRef(false);
  const personalStatsTriggeredRef = useRef(false);

  // Stable callback refs (avoids stale closures)
  const cbPortal = useRef(onPortalEnter);
  cbPortal.current = onPortalEnter;
  const cbUserInfo = useRef(onUserInfoEnter);
  cbUserInfo.current = onUserInfoEnter;
  const cbPersonalStats = useRef(onPersonalStatsEnter);
  cbPersonalStats.current = onPersonalStatsEnter;

  // ─── Sprite helper (direct DOM, no state) ───
  const applyFrame = (f: (typeof FRAMES)[keyof typeof FRAMES]) => {
    const el = spriteRef.current;
    if (!el) return;
    const bsx = (853 / f.w) * 100;
    const bsy = (1280 / f.h) * 100;
    const bpx = (f.x / (853 - f.w)) * 100;
    const bpy = (f.y / (1280 - f.h)) * 100;
    el.style.backgroundSize = `${bsx}% ${bsy}%`;
    el.style.backgroundPosition = `${bpx}% ${bpy}%`;
  };

  // ─── Key tracking ───
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "a" || k === "s" || k === "d") {
        e.preventDefault();
        keysRef.current.add(k);
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ─── Main game loop ───
  useEffect(() => {
    let raf: number;
    let lastTime = 0;

    // Set initial sprite
    applyFrame(FRAMES.standing);

    const tick = (now: number) => {
      // Delta-time capped at 50 ms to prevent teleporting after tab-switch
      const dt = lastTime === 0 ? 16.67 : Math.min(now - lastTime, 50);
      lastTime = now;

      const keys = keysRef.current;
      let dx = 0;
      let dy = 0;
      if (keys.has("a")) dx -= 1;
      if (keys.has("d")) dx += 1;
      if (keys.has("w")) dy -= 1;
      if (keys.has("s")) dy += 1;

      const moving = dx !== 0 || dy !== 0;

      // ── Facing ──
      if (dx < 0) facingRef.current = "left";
      else if (dx > 0) facingRef.current = "right";

      if (moving) {
        const len = Math.sqrt(dx * dx + dy * dy);
        const speed = MOVE_SPEED * (dt / 16.67) * 0.15;
        dx = (dx / len) * speed;
        dy = (dy / len) * speed;

        const prev = posRef.current;
        let nx = Math.max(2, Math.min(98, prev.x + dx));
        let ny = Math.max(5, Math.min(98, prev.y + dy));

        // ── Interactive zone checks (trigger + block) ──
        if (hitsRect(nx, ny, ZONE_USER_INFO) && !userInfoTriggeredRef.current) {
          userInfoTriggeredRef.current = true;
          cbUserInfo.current?.();
          // block movement into the zone
        } else if (
          hitsRect(nx, ny, ZONE_PERSONAL_STATS) &&
          !personalStatsTriggeredRef.current
        ) {
          personalStatsTriggeredRef.current = true;
          cbPersonalStats.current?.();
        } else if (insidePortal(nx, ny) && !portalTriggeredRef.current) {
          portalTriggeredRef.current = true;
          cbPortal.current?.();
        } else if (!collidesObstacle(nx, ny) && !collidesInteractive(nx, ny)) {
          // Free movement
          posRef.current = { x: nx, y: ny };
        } else {
          // Blocked – try axis-aligned sliding
          if (
            !collidesObstacle(nx, prev.y) &&
            !collidesInteractive(nx, prev.y)
          ) {
            posRef.current = { x: nx, y: prev.y };
          } else if (
            !collidesObstacle(prev.x, ny) &&
            !collidesInteractive(prev.x, ny)
          ) {
            posRef.current = { x: prev.x, y: ny };
          }
          // else: fully blocked, stay put
        }

        // ── Update DOM directly (no React state) ──
        const el = charRef.current;
        if (el) {
          el.style.left = `${posRef.current.x}%`;
          el.style.top = `${posRef.current.y}%`;
          el.style.transform = `translate(-50%, -50%) scaleX(${facingRef.current === "right" ? -1 : 1})`;
        }

        // ── Walk animation (frame-timed inside rAF) ──
        if (now - lastAnimRef.current >= ANIM_INTERVAL) {
          walkFrameRef.current = walkFrameRef.current === 0 ? 1 : 0;
          lastAnimRef.current = now;
          applyFrame(walkFrameRef.current === 0 ? FRAMES.walk1 : FRAMES.walk2);
        }
      } else if (isMovingRef.current) {
        // Just stopped – reset to standing frame
        applyFrame(FRAMES.standing);
      }

      isMovingRef.current = moving;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={charRef}
      className="absolute z-20 pointer-events-none"
      style={{
        left: `${SPAWN.x}%`,
        top: `${SPAWN.y}%`,
        width: CHAR_W,
        height: CHAR_H,
        transform: `translate(-50%, -50%) scaleX(-1)`,
      }}
    >
      <div
        ref={spriteRef}
        className="w-full h-full"
        style={{
          backgroundImage: `url(${SPRITE})`,
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
