import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { submitMinigame } from "@/lib/api";

const GAME_DURATION = 60;

const ROBOTICS_AI_TERMS = [
  // AI/ML
  "Tensor", "Neural", "Gradient", "Epoch", "Sigmoid", "Perceptron",
  "Backprop", "Bias", "Variance", "Overfit", "Dropout", "Softmax",
  "Heuristic", "Agent", "Cluster", "Vector", "Embedding", "Token",
  "Transformer", "Attention", "Latency", "Inference", "Dataset",
  // Robotics/Electronics
  "Actuator", "Servo", "Arduino", "Raspberry", "Micro", "Voltage",
  "Current", "Resistor", "Capacitor", "Inductor", "Diode", "Transistor",
  "MOSFET", "Relay", "Sensor", "Lidar", "Sonar", "Encoder", "Gyro",
  "Accel", "Magnet", "Solenoid", "Circuit", "PCB", "Schematic",
  "Firmware", "Signal", "Analog", "Digital", "PWM", "UART", "I2C",
  "SPI", "Serial", "Baud", "Kinematics", "Torque", "Payload", "DOF",
];

function calcScore(rawScore: number): number {
  return Math.max(60, Math.min(100, 60 + rawScore));
}

function pickNewWord(seen: Set<string>): string {
  let available = ROBOTICS_AI_TERMS.filter((w) => !seen.has(w));
  if (available.length === 0) available = [...ROBOTICS_AI_TERMS];
  return available[Math.floor(Math.random() * available.length)];
}

export default function InventoryManagement() {
  const navigate = useNavigate();

  const [gamePhase, setGamePhase] = useState<"start" | "playing" | "over">("start");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(3);
  const [rawScore, setRawScore] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [isNew, setIsNew] = useState(true);
  const seenRef = useRef<Set<string>>(new Set());

  // ── Infection selection ──
  const [infectionChoice, setInfectionChoice] = useState<null | "minor" | "major" | "none">(null);

  const nextWord = useCallback(() => {
    const seen = seenRef.current;
    // If no seen words yet, always show new
    if (seen.size === 0) {
      const word = pickNewWord(seen);
      seen.add(word);
      setCurrentWord(word);
      setIsNew(true);
      return;
    }
    // 40% chance to show a SEEN word
    if (Math.random() < 0.4) {
      const arr = Array.from(seen);
      setCurrentWord(arr[Math.floor(Math.random() * arr.length)]);
      setIsNew(false);
    } else {
      const word = pickNewWord(seen);
      seen.add(word);
      setCurrentWord(word);
      setIsNew(true);
    }
  }, []);

  const startGame = useCallback(() => {
    seenRef.current = new Set();
    setRawScore(0);
    setLives(3);
    setTimeLeft(GAME_DURATION);
    setGamePhase("playing");
    setInfectionChoice(null); // Reset infection choice
    // pick first word
    const word = pickNewWord(new Set());
    seenRef.current.add(word);
    setCurrentWord(word);
    setIsNew(true);
  }, []);

  /* Timer */
  useEffect(() => {
    if (gamePhase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGamePhase("over");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gamePhase]);

  const handleChoice = useCallback(
    (userSaysNew: boolean) => {
      if (gamePhase !== "playing") return;
      const correct = userSaysNew === isNew;
      if (correct) {
        setRawScore((s) => s + 1);
      } else {
        setLives((l) => {
          const nl = l - 1;
          if (nl <= 0) setGamePhase("over");
          return nl;
        });
      }
      nextWord();
    },
    [gamePhase, isNew, nextWord]
  );

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const score = calcScore(rawScore);

  // Submit score when infection choice is made
  const scoreSubmitted = useRef(false);
  useEffect(() => {
    if (!infectionChoice || scoreSubmitted.current) return;
    scoreSubmitted.current = true;
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      submitMinigame(sessionId, `inventory_atk_${Date.now()}`, score, infectionChoice).catch(console.error);
    }
  }, [infectionChoice, score]);

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
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(/inventory-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Double dark + blur overlay (matches Figma) */}
      <div className="absolute inset-0 bg-[rgba(10,10,10,0.5)] backdrop-blur-[5px]" />
      <div className="absolute inset-0 bg-[rgba(10,10,10,0.5)] backdrop-blur-[5px]" />

      {/* MAIN CONTENT */}
      <div className="absolute inset-0 z-10 flex flex-col items-center">
        {/* Title */}
        <h1 className="font-bold text-white text-[36px] sm:text-[50px] uppercase text-center mt-6 sm:mt-[30px] tracking-wider">
          Inventory Management
        </h1>

        {/* Timer */}
        <p className="font-bold text-[#f97316] text-[30px] sm:text-[40px] uppercase text-center mt-1" style={{ textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
          {mins}:{secs}
        </p>

        {/* Score & Error Margin row */}
        <div className="w-full max-w-[1000px] px-6 flex justify-between items-center mt-2">
          {/* Score panel */}
          <div className="relative min-w-[180px] bg-black/50 border-2 border-[#f97316]/30">
            <div className="relative px-5 py-3">
              <Corners size={16} />
              <p className="font-bold text-white text-[24px] sm:text-[30px] uppercase text-center">
                Score: <span className="text-[#f97316]">{gamePhase === "start" ? "\u2014" : score}</span>
              </p>
            </div>
          </div>

          {/* Error Margin panel */}
          <div className="relative min-w-[350px] bg-black/50 border-2 border-[#f97316]/30">
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

        {/* Word card */}
        <div className="flex-1 flex flex-col items-center justify-center w-full px-6 mt-2">
          <div className="relative bg-black/50 border-2 border-[#f97316]/30" style={{ width: 543, height: 264 }}>
            <div className="relative w-full h-full flex items-center justify-center">
              <Corners size={37} />
              <p className="font-bold text-white text-[40px] sm:text-[50px]">
                {currentWord || "\u00A0"}
              </p>
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex gap-8 mt-10">
            {/* ARCHIVED = seen before */}
            <button
              onClick={() => handleChoice(false)}
              disabled={gamePhase !== "playing"}
              className="w-[333px] h-[72px] border-2 border-[#f97316] bg-black/50 text-white text-[35px] font-normal transition-all hover:bg-[#f97316]/20 active:scale-95 disabled:opacity-40"
              style={{ boxShadow: '0 0 15px rgba(249,115,22,0.2)' }}
            >
              ARCHIVED
            </button>

            {/* LOG = new word */}
            <button
              onClick={() => handleChoice(true)}
              disabled={gamePhase !== "playing"}
              className="w-[333px] h-[72px] border-2 border-[#f97316] bg-black/50 text-white text-[35px] font-normal transition-all hover:bg-[#f97316]/20 active:scale-95 disabled:opacity-40"
              style={{ boxShadow: '0 0 15px rgba(249,115,22,0.2)' }}
            >
              LOG
            </button>
          </div>
        </div>
      </div>

      {/* START SCREEN */}
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
              REGISTER CATEGORIZATION
            </h2>

            {/* Protocol Section - Highlighted */}
            <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded px-4 py-3 mb-4">
              <p className="text-white/80 text-sm uppercase tracking-wider text-center font-semibold">
                {"PROTOCOL: MEMORIZE THE WORDS \u2022 "}
                <span className="text-[#f97316] font-bold text-base">60s</span>
                {" TIMER"}
              </p>
            </div>

            <p className="text-white/50 text-sm uppercase tracking-wider mb-2 text-center leading-relaxed">
              CLICK <span className="text-[#f97316]">LOG</span> IF THE WORD IS NEW
            </p>
            <p className="text-white/50 text-sm uppercase tracking-wider mb-8 text-center leading-relaxed">
              CLICK <span className="text-[#f97316]">ARCHIVED</span> IF YOU'VE SEEN IT BEFORE
            </p>

            <button
              onClick={startGame}
              className="w-full px-8 py-4 border-2 border-[#f97316] text-[#f97316] font-bold text-lg uppercase tracking-wider hover:bg-[#f97316]/20 transition-colors"
              style={{ boxShadow: '0 0 15px rgba(249,115,22,0.2)' }}
            >
              START CATEGORIZATION
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

      {/* GAME OVER SCREEN */}
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
                {lives <= 0 ? "// SYSTEM FAILURE" : "// CATEGORIZATION COMPLETE"}
              </p>
              <h2 className="font-bold text-2xl sm:text-3xl text-[#f97316] uppercase tracking-widest mb-3" style={{ textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
                {lives <= 0 ? "MEMORY BUFFER OVERFLOW" : "RESULTS"}
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
                  style={{ boxShadow: '0 0 15px rgba(249,115,22,0.2)' }}
                >
                  CONTINUE WITHOUT INFECT
                </button>
              </div>
            </>
          ) : (
            // Show scores after infection choice
            <>
              <p className="text-[#f97316]/60 text-xs uppercase tracking-[0.3em] mb-6">
                {lives <= 0 ? "// SYSTEM FAILURE" : "// CATEGORIZATION COMPLETE"}
              </p>
              <h2 className="font-bold text-2xl sm:text-3xl text-[#f97316] uppercase tracking-widest mb-3" style={{ textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
                {lives <= 0 ? "MEMORY BUFFER OVERFLOW" : "RESULTS"}
              </h2>

              <div className="flex gap-8 sm:gap-12 my-6">
                <div className="text-center">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">WORDS CATEGORIZED</p>
                  <p className="font-bold text-3xl sm:text-4xl text-[#f97316]">{rawScore}</p>
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
                  {score > 75 ? "AUTHORITY APPROVED" : "MEMORY BUFFER OVERFLOW"}
                </span>
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate("/attacker/play")}
                  className="px-8 py-3 border-2 border-[#f97316] text-[#f97316] font-bold text-sm uppercase tracking-wider hover:bg-[#f97316]/20 transition-colors"
                  style={{ boxShadow: '0 0 15px rgba(249,115,22,0.2)' }}
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
