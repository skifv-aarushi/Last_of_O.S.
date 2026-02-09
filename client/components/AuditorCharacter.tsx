import { useEffect, useRef } from "react";

/**
 * Auditor character — 3 separate sprite PNGs:
 *   standing : /auditor-sprites3.png
 *   walk1    : /auditor-sprites1.png
 *   walk2    : /auditor-sprites2.png
 */

const SPRITES = {
  standing: "/auditor-sprites3.png",
  walk1: "/auditor-sprites1.png",
  walk2: "/auditor-sprites2.png",
} as const;

const CHAR_W = 96;
const CHAR_H = 120;
const MOVE_SPEED = 2.5;
const ANIM_INTERVAL = 200; // ms per walk frame

// Character hitbox in % (smaller than sprite for forgiving feel)
const HB_W = 3; // % of viewport width
const HB_H = 4; // % of viewport height

// Spawn point – Center of the room
const SPAWN = { x: 49.2, y: 35.4 };

/**
 * Zones mapped from image-map coordinates (1440×1024 → viewport %).
 */

// ─── Interactive zones (collision + navigation trigger) ───
const ZONE_USER_INFO = { x1: 11.4, y1: 15.0, x2: 35.3, y2: 37.8 };
// Personal Stats is now just an obstacle, not an interactive zone

// Task Bay portal – circle → ellipse in viewport %
const PORTAL = { cx: 49.6, cy: 55.1, rx: 9.4, ry: 13.2 };

// ─── Pure obstacles (block movement, no navigation) ───
const RECT_OBSTACLES = [
  // Top wall / ceiling (above machines)
  { x1: 0, y1: 0, x2: 100, y2: 15.0 },
  // Left wall (beside User Info machine)
  { x1: 0, y1: 15.0, x2: 11.4, y2: 57 },
  // Right wall (beside Personal Stats machine)
  { x1: 88.0, y1: 15.0, x2: 100, y2: 57 },
  // Obstacle 1 – left panels
  { x1: 8.3, y1: 54.5, x2: 24.7, y2: 70.9 },
  // Obstacle 2 – right panels
  { x1: 74.2, y1: 53.7, x2: 90.2, y2: 70.7 },
  // Personal Stats Machine (now an obstacle)
  { x1: 63.7, y1: 17.5, x2: 88.0, y2: 41.9 },
  // Bottom-left pipes (approximate from image)
  { x1: 0, y1: 80, x2: 12, y2: 100 },
  // Bottom-right pipes (approximate from image)
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
    insidePortal(cx, cy)
  );
}

type Direction = "left" | "right";

interface Props {
  onPortalEnter?: () => void;
  onUserInfoEnter?: () => void;
}

/**
 * Performance-optimised Auditor character.
 * All per-frame state lives in refs; the DOM is updated directly
 * inside requestAnimationFrame so React never re-renders during movement.
 */
export default function AuditorCharacter({
  onPortalEnter,
  onUserInfoEnter,
}: Props) {
  // DOM refs
  const charRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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

  // Stable callback refs (avoids stale closures)
  const cbPortal = useRef(onPortalEnter);
  cbPortal.current = onPortalEnter;
  const cbUserInfo = useRef(onUserInfoEnter);
  cbUserInfo.current = onUserInfoEnter;

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
        const nx = Math.max(2, Math.min(98, prev.x + dx));
        const ny = Math.max(5, Math.min(98, prev.y + dy));

        // ── Interactive zone checks (trigger + block) ──
        if (hitsRect(nx, ny, ZONE_USER_INFO) && !userInfoTriggeredRef.current) {
          userInfoTriggeredRef.current = true;
          cbUserInfo.current?.();
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

        // ── Walk animation (swap sprite src) ──
        if (now - lastAnimRef.current >= ANIM_INTERVAL) {
          walkFrameRef.current = walkFrameRef.current === 0 ? 1 : 0;
          lastAnimRef.current = now;
          if (imgRef.current) {
            imgRef.current.src =
              walkFrameRef.current === 0 ? SPRITES.walk1 : SPRITES.walk2;
          }
        }
      } else if (isMovingRef.current) {
        // Just stopped – reset to standing frame
        if (imgRef.current) {
          imgRef.current.src = SPRITES.standing;
        }
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
      <img
        ref={imgRef}
        src={SPRITES.standing}
        alt="Auditor"
        className="w-full h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
