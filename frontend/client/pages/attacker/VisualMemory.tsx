import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { submitMinigame } from "@/lib/api";

const GAME_DURATION = 60;
const WATCH_TIME = 2250;
const TILE_SIZE = 65;
const GAP = 8;
const MAX_GRID = 6;
const FIXED_GRID_WIDTH = MAX_GRID * TILE_SIZE + (MAX_GRID - 1) * GAP;

type TileState = "default" | "target" | "correct" | "wrong";

function calcScore(level: number): number {
  return Math.max(60, Math.min(100, 60 + level * 4));
}

export default function VisualMemory() {
  const navigate = useNavigate();

  const [gamePhase, setGamePhase] = useState<"start" | "watching" | "playing" | "over">("start");
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gridSize, setGridSize] = useState(3);
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [clicked, setClicked] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const watchRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Infection selection ──
  const [infectionChoice, setInfectionChoice] = useState<null | "minor" | "major" | "none">(null);

  const generateLevel = useCallback((lvl: number) => {
    const gs = Math.min(6, 3 + Math.floor(lvl / 3));
    const numTargets = Math.min(gs * gs - 1, 2 + lvl);
    const t = new Set<string>();
    while (t.size < numTargets) {
      const r = Math.floor(Math.random() * gs);
      const c = Math.floor(Math.random() * gs);
      t.add(`${r},${c}`);
    }
    setGridSize(gs);
    setTargets(t);
    setClicked(new Set());
    setWrong(new Set());
  }, []);

  const startGame = useCallback(() => {
    setLevel(1);
    setLives(3);
    setTimeLeft(GAME_DURATION);
    generateLevel(1);
    setGamePhase("watching");
    setInfectionChoice(null); // Reset infection choice
  }, [generateLevel]);

  /* Countdown timer — runs while watching or playing */
  useEffect(() => {
    if (gamePhase !== "watching" && gamePhase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGamePhase("over");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [gamePhase]);

  /* Watch-phase timeout — auto-transition to playing */
  useEffect(() => {
    if (gamePhase !== "watching") return;
    const id = setTimeout(() => setGamePhase("playing"), WATCH_TIME);
    watchRef.current = id;
    return () => clearTimeout(id);
  }, [gamePhase]);

  const advanceLevel = useCallback(
    (nextLvl: number) => {
      generateLevel(nextLvl);
      setGamePhase("watching");
    },
    [generateLevel]
  );

  const handleTileClick = useCallback(
    (r: number, c: number) => {
      if (gamePhase !== "playing") return;
      const key = `${r},${c}`;
      if (clicked.has(key) || wrong.has(key)) return;

      if (targets.has(key)) {
        const nc = new Set(clicked);
        nc.add(key);
        setClicked(nc);
        if (nc.size === targets.size) {
          const next = level + 1;
          setLevel(next);
          advanceLevel(next);
        }
      } else {
        const nw = new Set(wrong);
        nw.add(key);
        setWrong(nw);
        const nl = lives - 1;
        setLives(nl);
        if (nl <= 0) setGamePhase("over");
      }
    },
    [gamePhase, clicked, wrong, targets, level, lives, advanceLevel]
  );

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const score = calcScore(level);

  // Submit score when infection choice is made
  const scoreSubmitted = useRef(false);
  useEffect(() => {
    if (!infectionChoice || scoreSubmitted.current) return;
    scoreSubmitted.current = true;
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      submitMinigame(sessionId, `memory_atk_${Date.now()}`, score, infectionChoice).catch(console.error);
    }
  }, [infectionChoice, score]);

  const renderGrid = () => {
    const tiles: JSX.Element[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const key = `${r},${c}`;
        const isTarget = targets.has(key);
        const isClicked = clicked.has(key);
        const isWrong = wrong.has(key);

        let state: TileState = "default";
        if (gamePhase === "watching" && isTarget) state = "target";
        else if (isClicked) state = "correct";
        else if (isWrong) state = "wrong";

        const bg =
          state === "target" || state === "correct"
            ? "#f97316"
            : state === "wrong"
              ? "#e54444"
              : "#24272c";

        const shadow =
          state === "target" || state === "correct"
            ? "-4px -4px 10px 0px rgba(249,115,22,0.15), 4px 4px 10px 0px rgba(0,0,0,0.25), inset 2.4px 2.4px 2.4px 0px rgba(255,255,255,0.25)"
            : state === "wrong"
              ? "-4px -4px 10px 0px rgba(229,68,68,0.15), 4px 4px 10px 0px rgba(0,0,0,0.25), inset 2.4px 2.4px 2.4px 0px rgba(255,255,255,0.15)"
              : "-6px -6px 12px 0px rgba(255,255,255,0.05), 6px 6px 12px 0px rgba(0,0,0,0.25), inset 2.4px 2.4px 2.4px 0px rgba(255,255,255,0.15)";

        const clickable = gamePhase === "playing" && !isClicked && !isWrong;

        tiles.push(
          <button
            key={key}
            disabled={!clickable}
            onClick={() => handleTileClick(r, c)}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              backgroundColor: bg,
              borderRadius: 14.4,
              border: "0.6px solid #111214",
              boxShadow: shadow,
              cursor: clickable ? "pointer" : "default",
              transition: "all 150ms",
            }}
            className={clickable ? "hover:brightness-110 active:scale-95" : ""}
          />
        );
      }
    }
    return tiles;
  };

  const renderLives = () =>
    Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="rounded-sm transition-all duration-300"
        style={{
          height: 17,
          width: 69,
          backgroundColor: i < lives ? "#f97316" : "#24272c",
        }}
      />
    ));

  /* Corner-bracket decorator */
  const Corners = ({ size = 13 }: { size?: number }) => (
    <>
      <div className="absolute top-0 left-0 border-t-[2.4px] border-l-[2.4px] border-[#f97316]/60" style={{ width: size, height: size }} />
      <div className="absolute top-0 right-0 border-t-[2.4px] border-r-[2.4px] border-[#f97316]/60" style={{ width: size, height: size }} />
      <div className="absolute bottom-0 left-0 border-b-[2.4px] border-l-[2.4px] border-[#f97316]/60" style={{ width: size, height: size }} />
      <div className="absolute bottom-0 right-0 border-b-[2.4px] border-r-[2.4px] border-[#f97316]/60" style={{ width: size, height: size }} />
    </>
  );

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-[#0a0a0a] select-none"
      style={{ fontFamily: "'Jura', sans-serif" }}
    >
      {/* ── Background ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(/memory-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Dark + blur overlay */}
      <div className="absolute inset-0 bg-[rgba(10,10,10,0.50)] backdrop-blur-[5px]" />

      {/* ── MAIN CONTENT ── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center">
        {/* Title */}
        <h1 className="font-bold text-white text-[36px] sm:text-[50px] uppercase text-center mt-6 sm:mt-[30px] tracking-wider">
          Code Calibration
        </h1>

        {/* Timer */}
        <p className="font-bold text-[#f97316] text-[30px] sm:text-[40px] uppercase text-center mt-1">
          {mins}:{secs}
        </p>

        {/* Score & Error Margin row */}
        <div className="w-full max-w-[1000px] px-6 flex justify-between items-center mt-2">
          {/* Score panel */}
          <div className="relative min-w-[180px] bg-black/50 border-2 border-[#f97316]/30" style={{ padding: 0 }}>
            <div className="relative px-5 py-3">
              <Corners size={16} />
              <p className="font-bold text-white text-[24px] sm:text-[30px] uppercase text-center">
                Score: <span className="text-[#f97316]">{gamePhase === "start" ? "\u2014" : score}</span>
              </p>
            </div>
          </div>

          {/* Error Margin panel */}
          <div className="relative min-w-[350px] bg-black/50 border-2 border-[#f97316]/30" style={{ padding: 0 }}>
            <div className="relative px-5 py-3">
              <Corners size={16} />
              <div className="flex items-center justify-center gap-4">
                <p className="font-bold text-white text-[24px] sm:text-[30px] uppercase whitespace-nowrap">
                  Error Margin:
                </p>
                <div className="flex gap-[20px]">{renderLives()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid card — fixed size container so it never shifts */}
        <div className="flex-1 flex flex-col items-center justify-center w-full px-6 mt-2">
          <div
            className="relative bg-black/50 border-2 border-[#f97316]/30"
            style={{ width: FIXED_GRID_WIDTH + 64, height: FIXED_GRID_WIDTH + 64, padding: 0 }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Corners size={13} />
              {/* CSS Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${gridSize}, ${TILE_SIZE}px)`,
                  gap: GAP,
                }}
              >
                {renderGrid()}
              </div>
            </div>
          </div>

          {/* Memorize text — below the grid card */}
          {gamePhase === "watching" && (
            <p className="font-bold text-[#f97316] text-xl sm:text-2xl uppercase tracking-widest animate-pulse mt-4">
              Memorize the pattern...
            </p>
          )}
        </div>
      </div>

      {/* ── START SCREEN ── */}
      {gamePhase === "start" && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85"
          style={{ fontFamily: "'Jura', sans-serif" }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(249,115,22,0.08) 2px, rgba(249,115,22,0.08) 4px)",
            }}
          />

          {/* Standout Mission Briefing Card */}
          <div className="relative px-12 py-10 max-w-lg w-full mx-4" style={{
            background: 'linear-gradient(135deg, rgba(40,20,10,0.95) 0%, rgba(50,25,12,0.9) 100%)',
            border: '2px solid rgba(249,115,22,0.6)',
            boxShadow: '0 0 30px rgba(249,115,22,0.3), 0 0 60px rgba(249,115,22,0.15), inset 0 0 30px rgba(249,115,22,0.05)'
          }}>
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-[#f97316]" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-[#f97316]" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-[#f97316]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-[#f97316]" />

            <p className="text-[#f97316] text-sm uppercase tracking-[0.4em] mb-5 text-center font-medium">// MISSION BRIEFING</p>
            <h2 className="font-bold text-3xl sm:text-4xl text-[#f97316] uppercase tracking-widest mb-5 text-center" style={{ textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
              MACHINE LEARNING
            </h2>

            {/* Protocol Section - Highlighted */}
            <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded px-4 py-3 mb-4">
              <p className="text-white/80 text-sm uppercase tracking-wider text-center font-semibold">
                {"PROTOCOL: MEMORIZE THE PATTERN \u2022 "}
                <span className="text-[#f97316] font-bold text-base">60s</span>
                {" TIMER"}
              </p>
            </div>

            <p className="text-white/50 text-sm uppercase tracking-wider mb-8 text-center leading-relaxed">
              REPLICATE THE HIGHLIGHTED TILES FROM MEMORY
            </p>

            <button
              onClick={startGame}
              className="w-full px-8 py-4 border-2 border-[#f97316] text-[#f97316] font-bold text-lg uppercase tracking-wider hover:bg-[#f97316]/20 transition-colors"
              style={{ boxShadow: '0 0 15px rgba(249,115,22,0.2)' }}
            >
              START CALIBRATION
            </button>
          </div>

          <button
            onClick={() => navigate("/attacker/play")}
            className="mt-6 px-6 py-2 border border-white/30 text-white/50 font-bold text-sm uppercase hover:text-white/80 hover:border-white/50 transition-colors"
          >
            {"\u2190 BACK TO BASE"}
          </button>
        </div>
      )}

      {/* ── GAME OVER ── */}
      {gamePhase === "over" && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 animate-loading-fade-in"
          style={{ fontFamily: "'Jura', sans-serif" }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(249,115,22,0.08) 2px, rgba(249,115,22,0.08) 4px)",
            }}
          />
          <div className="absolute top-[30%] left-0 right-0 h-px bg-[#f97316]/20" />
          <div className="absolute top-[70%] left-0 right-0 h-px bg-[#f97316]/20" />

          {!infectionChoice ? (
            // Show infection options
            <>
              <p className="text-[#f97316]/60 text-xs uppercase tracking-[0.3em] mb-6">
                {lives <= 0 ? "// SYSTEM FAILURE" : "// CALIBRATION COMPLETE"}
              </p>
              <h2 className="font-bold text-2xl sm:text-3xl text-[#f97316] uppercase tracking-widest mb-3" style={{ textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
                {lives <= 0 ? "PATTERN MISMATCH" : "RESULTS"}
              </h2>

              <p className="text-white/50 text-sm uppercase tracking-wider mb-8">
                SELECT INFECTION LEVEL
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => setInfectionChoice("minor")}
                  className="px-8 py-3 border-2 border-yellow-500 text-yellow-500 font-bold text-sm uppercase tracking-wider hover:bg-yellow-500/20 transition-colors"
                >
                  MINOR INFECT
                </button>
                <button
                  onClick={() => setInfectionChoice("major")}
                  className="px-8 py-3 border-2 border-red-500 text-red-500 font-bold text-sm uppercase tracking-wider hover:bg-red-500/20 transition-colors"
                >
                  MAJOR INFECT
                </button>
                <button
                  onClick={() => setInfectionChoice("none")}
                  className="px-8 py-3 border-2 border-[#f97316] text-[#f97316] font-bold text-sm uppercase tracking-wider hover:bg-[#f97316]/20 transition-colors"
                >
                  CONTINUE WITHOUT INFECT
                </button>
              </div>
            </>
          ) : (
            // Show scores after infection choice
            <>
              <p className="text-[#f97316]/60 text-xs uppercase tracking-[0.3em] mb-6">
                {lives <= 0 ? "// SYSTEM FAILURE" : "// CALIBRATION COMPLETE"}
              </p>
              <h2 className="font-bold text-2xl sm:text-3xl text-[#f97316] uppercase tracking-widest mb-3" style={{ textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
                {lives <= 0 ? "PATTERN MISMATCH" : "RESULTS"}
              </h2>

              <div className="flex gap-8 sm:gap-12 my-6">
                <div className="text-center">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">MAX LEVEL</p>
                  <p className="font-bold text-3xl sm:text-4xl text-[#f97316]">{level}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">ORIGINAL SCORE</p>
                  <p className="font-bold text-3xl sm:text-4xl text-[#f97316]">{score}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">NEW SCORE</p>
                  <p className="font-bold text-3xl sm:text-4xl text-[#f97316]">
                    {infectionChoice === "major"
                      ? Math.max(0, score - 10)
                      : infectionChoice === "minor"
                        ? Math.max(0, score - 6)
                        : score}
                  </p>
                </div>
              </div>

              <p className="text-white/50 text-sm uppercase tracking-wider mb-2">
                INFECTION LEVEL: <span className={`font-bold ${infectionChoice === "major" ? "text-red-400" :
                  infectionChoice === "minor" ? "text-yellow-400" :
                    "text-green-400"
                  }`}>
                  {infectionChoice === "major" ? "MAJOR" : infectionChoice === "minor" ? "MINOR" : "NONE"}
                </span>
              </p>

              <p className="text-white/50 text-sm uppercase tracking-wider mb-8">
                {"STATUS : "}
                <span className={"font-bold " + (score > 75 ? "text-green-400" : "text-yellow-400")}>
                  {score > 75 ? "AUTHORITY APPROVED" : "TRAINING REQUIRED"}
                </span>
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate("/attacker/play")}
                  className="px-8 py-3 border-2 border-[#f97316] text-[#f97316] font-bold text-sm uppercase tracking-wider hover:bg-[#f97316]/20 transition-colors"
                >
                  RETURN TO BASE
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
