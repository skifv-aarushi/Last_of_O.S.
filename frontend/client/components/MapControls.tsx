import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Extra controls for the maps. The characters listen for W/A/S/D keydown/keyup on window,
 * so arrow keys and the touch D-pad simply re-send those keys.
 */
const ARROWS: Record<string, string> = { ArrowUp: "w", ArrowLeft: "a", ArrowDown: "s", ArrowRight: "d" };

const send = (type: "keydown" | "keyup", key: string) =>
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));

function useTouchDevice() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setTouch(mq.matches || window.innerWidth < 768);
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => { mq.removeEventListener("change", update); window.removeEventListener("resize", update); };
  }, []);
  return touch;
}

export default function MapControls({ accent = "#00e5ff" }: { accent?: string }) {
  const touch = useTouchDevice();
  const [portrait, setPortrait] = useState(false);
  const [hideRotate, setHideRotate] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // arrow keys behave like WASD
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = ARROWS[e.key];
      if (!key) return;
      e.preventDefault();
      send(e.type as "keydown" | "keyup", key);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    return () => { window.removeEventListener("keydown", handler); window.removeEventListener("keyup", handler); };
  }, []);

  const pad = (key: string, label: string, area: string) => (
    <button
      key={key}
      aria-label={`Move ${label}`}
      className="w-14 h-14 bg-black/60 border-2 font-pixel text-sm active:bg-white/20 select-none"
      style={{ gridArea: area, borderColor: `${accent}99`, color: accent, touchAction: "none" }}
      onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); send("keydown", key); }}
      onPointerUp={() => send("keyup", key)}
      onPointerCancel={() => send("keyup", key)}
      onLostPointerCapture={() => send("keyup", key)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );

  return (
    <>
      <Link
        to="/how-to-play"
        aria-label="How to play"
        className="absolute z-40 top-[6px] right-3 w-8 h-8 flex items-center justify-center bg-black/75 border font-pixel text-xs hover:bg-white/10"
        style={{ borderColor: `${accent}66`, color: accent }}
      >
        ?
      </Link>

      {touch && portrait && !hideRotate && (
        <button
          onClick={() => setHideRotate(true)}
          className="absolute z-40 bottom-5 right-4 max-w-[45%] bg-black/75 border px-3 py-2 font-pixel text-[8px] leading-relaxed text-left"
          style={{ borderColor: `${accent}66`, color: accent }}
        >
          TURN YOUR PHONE SIDEWAYS FOR A WIDER VIEW (TAP TO HIDE)
        </button>
      )}

      {touch && (
        <div
          className="absolute z-40 bottom-5 left-5 grid gap-1"
          style={{ gridTemplateAreas: '". up ." "left down right"', gridTemplateColumns: "repeat(3, 3.5rem)" }}
        >
          {pad("w", "▲", "up")}
          {pad("a", "◀", "left")}
          {pad("s", "▼", "down")}
          {pad("d", "▶", "right")}
        </div>
      )}
    </>
  );
}
