import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGameGuard } from "@/hooks/use-game-guard";
import { PIDGame, type Environment } from "@/lib/pidGameLogic";
import { submitMinigame } from "@/lib/api";

const GAME_DURATION = 60;
const MAX_ROUNDS = 4;

// Calculate score from final result
function calcScore(score: number): { label: string; color: string } {
    if (score > 90) return { label: "MASTER", color: "text-green-400" };
    if (score > 75) return { label: "ENGINEER", color: "text-yellow-400" };
    return { label: "ROOKIE", color: "text-orange-400" };
}

// Image-based Angle Meter Component
// Has 90 on both ends: left side = -90°, right side = +90°
// Needle naturally points north (0°) when error is 0
function AngleMeter({ angle, direction }: { angle: number; direction: 1 | -1 }) {
    // Angle is 0-90, direction determines left (-1) or right (+1) tilt
    const displayAngle = Math.min(90, Math.max(0, Math.abs(angle)));
    // Needle rotation: 0° error = pointing up (0deg), ±90° = pointing left/right
    // direction: 1 = tilt right (positive rotation), -1 = tilt left (negative rotation)
    const needleRotation = displayAngle * direction;

    return (
        <div className="relative w-48 h-32">
            {/* Angle meter background image */}
            <img
                src="/pid-angle-meter.png"
                alt="Angle Meter"
                className="w-full h-full object-contain"
            />
            {/* Needle overlay - positioned at center-bottom of the meter arc */}
            <div
                className="absolute"
                style={{
                    left: '50%',
                    bottom: '8%',
                    width: '3px',
                    height: '45%',
                    transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${needleRotation}deg)`,
                    transition: 'transform 0.5s ease-out'
                }}
            >
                <div className="w-full h-full bg-gradient-to-t from-[#6ec4e5] to-[#4fd1c5] rounded-full shadow-[0_0_10px_rgba(110,196,229,0.8)]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#6ec4e5] rounded-full shadow-[0_0_6px_rgba(110,196,229,0.8)]" />
            </div>
            {/* Angle value display - synced with needle */}
            <div className="absolute top-2 right-2 bg-[#0a1428]/90 px-2 py-1 border border-[#6ec4e5]/40 rounded">
                <span className="text-[#6ec4e5] font-bold text-lg">{Math.round(displayAngle)}°</span>
            </div>
        </div>
    );
}

// Updated PID Slider Component - pointer cursor instead of resize cursor
function PIDSlider({
    label,
    value,
    onChange,
    min,
    max,
    step = 0.1,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
}) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="flex items-center gap-4 w-full">
            {/* Label - larger rounded square */}
            <div className="w-12 h-12 flex items-center justify-center bg-[#2a3440] rounded-xl text-white/90 font-bold text-2xl shrink-0 shadow-inner">
                {label}
            </div>

            {/* Slider track - larger, rounded with gradient fill, POINTER CURSOR */}
            <div className="flex-1 relative h-12 bg-[#1a2530] rounded-2xl overflow-hidden shadow-inner cursor-pointer">
                {/* Filled portion - gradient from left */}
                <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#3a6a7a] to-[#5a99a8] rounded-l-2xl"
                    style={{ width: `${percentage}%` }}
                />
                {/* Slider thumb - larger rounded rectangle */}
                <div
                    className="absolute top-1.5 bottom-1.5 w-8 bg-[#5a8a9a] rounded-xl shadow-lg cursor-pointer"
                    style={{ left: `calc(${percentage}% - 16px)` }}
                />
                {/* Input range - POINTER CURSOR */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>

            {/* Value display - larger dark rounded box */}
            <div className="w-20 h-12 flex items-center justify-center bg-[#1a2530] rounded-2xl text-[#6ec4e5] font-mono text-xl shrink-0 shadow-inner">
                {value.toFixed(1)}
            </div>
        </div>
    );
}

// Environment display component - larger text
function EnvironmentDisplay({ env }: { env: Environment }) {
    return (
        <div className="bg-[#0a1428]/70 border border-[#6ec4e5]/30 p-5 rounded-lg space-y-2">
            <h3 className="text-[#6ec4e5] font-bold uppercase text-base tracking-wider mb-4">
                Environmental Readings
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div><span className="text-white/60">Gravity:</span> <span className="text-[#6ec4e5] font-semibold">{env.gravity.toFixed(1)}</span></div>
                <div><span className="text-white/60">Mass:</span> <span className="text-[#6ec4e5] font-semibold">{env.mass.toFixed(1)}</span></div>
                <div><span className="text-white/60">Wind:</span> <span className="text-[#6ec4e5] font-semibold">{env.wind.toFixed(1)}</span></div>
                <div><span className="text-white/60">Air Density:</span> <span className="text-[#6ec4e5] font-semibold">{env.airDensity.toFixed(2)}</span></div>
                <div><span className="text-white/60">Noise:</span> <span className="text-[#6ec4e5] font-semibold">{env.sensorNoise.toFixed(1)}</span></div>
                <div><span className="text-white/60">Turbulence:</span> <span className="text-[#6ec4e5] font-semibold">{env.turbulence.toFixed(1)}</span></div>
            </div>
        </div>
    );
}

export default function PIDTuning() {
    const navigate = useNavigate();
    useGameGuard("citizen");

    // Game instance
    const gameRef = useRef<PIDGame | null>(null);

    // Game states
    const [gamePhase, setGamePhase] = useState<"start" | "playing" | "over">("start");
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [currentRound, setCurrentRound] = useState(1);
    const [currentEnv, setCurrentEnv] = useState<Environment | null>(null);

    // PID values
    const [kp, setKp] = useState(10.0);
    const [ki, setKi] = useState(0.0);
    const [kd, setKd] = useState(5.0);

    // Current simulation error (raw from simulation)
    const [rawError, setRawError] = useState(0);

    // Tilt direction: alternates each round or based on some condition
    const [tiltDirection, setTiltDirection] = useState<1 | -1>(1);

    // Final results
    const [finalScore, setFinalScore] = useState(0);
    const [roundsCompleted, setRoundsCompleted] = useState(0);

    // Calculate display error (capped between 0-100 for user-friendly display)
    const displayError = useMemo(() => {
        return Math.min(100, Math.max(0, rawError));
    }, [rawError]);

    // Calculate tilt angle for robot (0-90 degrees based on error)
    const tiltAngle = useMemo(() => {
        const cappedError = Math.min(100, Math.max(0, rawError));
        // Map error 0-100 to angle 0-90
        return (cappedError / 100) * 90;
    }, [rawError]);

    // Initialize game
    useEffect(() => {
        gameRef.current = new PIDGame(GAME_DURATION, MAX_ROUNDS);
    }, []);

    // Timer effect
    useEffect(() => {
        if (gamePhase !== "playing") return;

        const id = setInterval(() => {
            const remaining = gameRef.current?.getTimeRemaining() ?? 0;
            setTimeLeft(Math.ceil(remaining));

            if (remaining <= 0) {
                endGame();
            }
        }, 100);

        return () => clearInterval(id);
    }, [gamePhase]);

    // Run simulation when PID values change
    useEffect(() => {
        if (gamePhase !== "playing" || !gameRef.current) return;

        const error = gameRef.current.runSimulation(kp, ki, kd);
        setRawError(error);

        // Determine tilt direction based on wind or some random factor
        // Positive wind = tilt right, negative wind = tilt left
        if (gameRef.current.currentEnv) {
            setTiltDirection(gameRef.current.currentEnv.wind >= 0 ? 1 : -1);
        }
    }, [kp, ki, kd, gamePhase, currentRound]);

    // Start game
    const startGame = useCallback(() => {
        if (!gameRef.current) {
            gameRef.current = new PIDGame(GAME_DURATION, MAX_ROUNDS);
        }
        gameRef.current.startSession();
        setCurrentEnv(gameRef.current.currentEnv);
        setCurrentRound(1);
        setTimeLeft(GAME_DURATION);
        setKp(10.0);
        setKi(0.0);
        setKd(5.0);
        setTiltDirection(gameRef.current.currentEnv?.wind ?? 0 >= 0 ? 1 : -1);
        setGamePhase("playing");
    }, []);

    // End game
    const endGame = useCallback(() => {
        if (!gameRef.current) return;

        setFinalScore(gameRef.current.getFinalScore());
        setRoundsCompleted(gameRef.current.getRoundsCompleted());
        setGamePhase("over");
    }, []);

    // Submit score to backend when game ends
    const scoreSubmitted = useRef(false);
    useEffect(() => {
        if (gamePhase !== "over" || scoreSubmitted.current) return;
        scoreSubmitted.current = true;
        const sessionId = localStorage.getItem("sessionId");
        if (sessionId) {
            submitMinigame(sessionId, `pid_${Date.now()}`, finalScore).catch(console.error);
        }
    }, [gamePhase, finalScore]);

    // Submit round
    const submitRound = useCallback(() => {
        if (!gameRef.current) return;

        const error = gameRef.current.runSimulation(kp, ki, kd);
        gameRef.current.submitRound(error);

        if (gameRef.current.isGameOver()) {
            endGame();
        } else {
            setCurrentEnv(gameRef.current.currentEnv);
            setCurrentRound(gameRef.current.getRoundsCompleted() + 1);
            // Reset PID values for new round
            setKp(10.0);
            setKi(0.0);
            setKd(5.0);
            // Update tilt direction for new round
            setTiltDirection(gameRef.current.currentEnv?.wind ?? 0 >= 0 ? 1 : -1);
        }
    }, [kp, ki, kd, endGame]);

    // Format time
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const secs = String(timeLeft % 60).padStart(2, "0");

    return (
        <div
            className="relative w-full h-screen overflow-hidden bg-[#0a0a0a] select-none"
            style={{ fontFamily: "'Jura', sans-serif" }}
        >
            {/* Background image */}
            <img
                src="/pid-bg.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* ═══ START SCREEN ═══ */}
            {gamePhase === "start" && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85">
                    <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(110,196,229,0.08) 2px, rgba(110,196,229,0.08) 4px)' }}
                    />

                    {/* Standout Mission Briefing Card */}
                    <div className="relative px-12 py-10 max-w-lg w-full mx-4" style={{
                        background: 'linear-gradient(135deg, rgba(10,20,40,0.95) 0%, rgba(15,30,50,0.9) 100%)',
                        border: '2px solid rgba(110,196,229,0.6)',
                        boxShadow: '0 0 30px rgba(110,196,229,0.3), 0 0 60px rgba(110,196,229,0.15), inset 0 0 30px rgba(110,196,229,0.05)'
                    }}>
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-[#6ec4e5]" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-[#6ec4e5]" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-[#6ec4e5]" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-[#6ec4e5]" />

                        <p className="text-[#6ec4e5] text-sm uppercase tracking-[0.4em] mb-5 text-center font-medium">// MISSION BRIEFING</p>
                        <h2 className="font-bold text-3xl sm:text-4xl text-[#6ec4e5] uppercase tracking-widest mb-5 text-center" style={{ textShadow: '0 0 20px rgba(110,196,229,0.5)' }}>PID FINE-TUNING</h2>

                        {/* Protocol Section - Highlighted */}
                        <div className="bg-[#6ec4e5]/10 border border-[#6ec4e5]/30 rounded px-4 py-3 mb-4">
                            <p className="text-white/80 text-sm uppercase tracking-wider text-center font-semibold">
                                PROTOCOL: STABILIZE THE BOT ACROSS <span className="text-[#6ec4e5] font-bold text-base">{MAX_ROUNDS} ROUNDS</span>
                            </p>
                        </div>

                        <p className="text-white/50 text-sm uppercase tracking-wider mb-8 text-center leading-relaxed">ADJUST P, I, D VALUES TO MINIMIZE OSCILLATION • TIME LIMIT: {GAME_DURATION}s</p>

                        <button
                            onClick={startGame}
                            className="w-full px-8 py-4 border-2 border-[#6ec4e5] text-[#6ec4e5] font-bold text-lg uppercase tracking-wider hover:bg-[#6ec4e5]/20 transition-colors"
                            style={{ boxShadow: '0 0 15px rgba(110,196,229,0.2)' }}
                        >
                            START MANUAL OVERRIDE
                        </button>
                    </div>

                    <button
                        onClick={() => navigate("/play")}
                        className="mt-6 px-6 py-2 border border-white/30 text-white/50 font-bold text-sm uppercase hover:text-white/80 hover:border-white/50 transition-colors"
                    >
                        ← BACK TO BASE
                    </button>
                </div>
            )}

            {/* ═══ GAMEPLAY ═══ */}
            {gamePhase === "playing" && (
                <div className="absolute inset-0 z-10 flex flex-col p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        {/* Left: EXIT */}
                        <button
                            onClick={() => navigate("/play")}
                            className="px-3 py-1.5 border border-[#6ec4e5]/40 bg-black/50 text-[#6ec4e5] font-bold text-xs uppercase hover:bg-[#6ec4e5]/20 transition-colors"
                        >
                            ← EXIT
                        </button>

                        {/* Center: Title + Timer */}
                        <div className="text-center">
                            <h1 className="font-bold text-2xl text-[#6ec4e5] uppercase tracking-widest">
                                PID TUNER
                            </h1>
                            <p className="font-bold text-xl text-white mt-1">
                                {mins}:{secs}
                            </p>
                        </div>

                        {/* Right: Angle meter */}
                        <AngleMeter angle={tiltAngle} direction={tiltDirection} />
                    </div>

                    {/* Main content - spread across screen */}
                    <div className="flex-1 flex flex-col">
                        {/* Content row */}
                        <div className="flex-1 flex">
                            {/* Left: Controls - extends to ~45% of screen (right edge at center) */}
                            <div className="w-[45%] space-y-5 pl-6 pr-8">
                                {/* Round indicator - larger */}
                                <div className="text-[#6ec4e5] font-bold uppercase text-lg">
                                    Round {currentRound} / {MAX_ROUNDS}
                                </div>

                                {/* Environment display */}
                                {currentEnv && <EnvironmentDisplay env={currentEnv} />}

                                {/* PID Sliders - larger with more spacing */}
                                <div className="space-y-4">
                                    <PIDSlider label="P" value={kp} onChange={setKp} min={0} max={50} />
                                    <PIDSlider label="I" value={ki} onChange={setKi} min={0} max={20} />
                                    <PIDSlider label="D" value={kd} onChange={setKd} min={0} max={50} />
                                </div>

                                {/* Error display - larger */}
                                <div className="bg-[#0a1428]/70 border border-[#6ec4e5]/30 p-4 rounded-lg">
                                    <span className="text-white/60 text-base">Current Error: </span>
                                    <span className="text-[#6ec4e5] font-bold text-lg">{displayError.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Right: Robot grid - takes remaining 55% of screen */}
                            <div className="w-[55%] flex items-center justify-center pr-8">
                                {/* Grid container - larger, fills available space */}
                                <div className="relative w-full max-w-[550px] h-[420px]">
                                    {/* Grid background */}
                                    <div className="absolute inset-0 border border-[#6ec4e5]/20 bg-[#0a1428]/30">
                                        {/* Grid lines */}
                                        <div className="absolute inset-0" style={{
                                            backgroundImage: `
                        linear-gradient(to right, rgba(110,196,229,0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(110,196,229,0.1) 1px, transparent 1px)
                      `,
                                            backgroundSize: '50px 50px'
                                        }} />
                                        {/* Corner brackets */}
                                        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#6ec4e5]/40" />
                                        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#6ec4e5]/40" />
                                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#6ec4e5]/40" />
                                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#6ec4e5]/40" />
                                    </div>

                                    {/* Robot container - pivot point at bottom center (wheel position) */}
                                    <div
                                        className="absolute bottom-0 left-1/2 z-10"
                                        style={{
                                            transform: `translateX(-50%) rotate(${tiltAngle * tiltDirection}deg)`,
                                            transformOrigin: 'bottom center',
                                            transition: 'transform 0.5s ease-out'
                                        }}
                                    >
                                        <img
                                            src="/pid-robot.png"
                                            alt="Robot"
                                            className="w-64 h-auto drop-shadow-[0_0_25px_rgba(110,196,229,0.4)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Confirm button - centered on screen */}
                        <div className="flex justify-center mt-4 mb-2">
                            <button
                                onClick={submitRound}
                                className="px-16 py-4 border-2 border-[#6ec4e5] bg-black/50 text-white font-bold text-xl uppercase tracking-wider hover:bg-[#6ec4e5]/20 transition-colors"
                                style={{ boxShadow: '0 0 15px rgba(110,196,229,0.2)' }}
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ GAME OVER SCREEN ═══ */}
            {gamePhase === "over" && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
                    <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(110,196,229,0.08) 2px, rgba(110,196,229,0.08) 4px)' }}
                    />
                    <div className="absolute top-[30%] left-0 right-0 h-px bg-[#6ec4e5]/20" />
                    <div className="absolute top-[70%] left-0 right-0 h-px bg-[#6ec4e5]/20" />

                    <p className="text-[#6ec4e5]/60 text-xs uppercase tracking-[0.3em] mb-6">
            // SESSION COMPLETE
                    </p>
                    <h2 className="font-bold text-2xl sm:text-3xl text-[#6ec4e5] uppercase tracking-widest mb-6" style={{ textShadow: '0 0 20px rgba(110,196,229,0.5)' }}>
                        CALIBRATION COMPLETE
                    </h2>

                    <div className="flex gap-12 my-6">
                        <div className="text-center">
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">ROUNDS</p>
                            <p className="font-bold text-3xl text-[#6ec4e5]">{roundsCompleted}/{MAX_ROUNDS}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">STABILITY SCORE</p>
                            <p className="font-bold text-3xl text-[#6ec4e5]">{finalScore}</p>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={() => navigate("/play")}
                            className="px-8 py-3 border-2 border-[#6ec4e5] text-[#6ec4e5] font-bold text-sm uppercase tracking-wider hover:bg-[#6ec4e5]/20 transition-colors"
                        >
                            RETURN TO BASE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
