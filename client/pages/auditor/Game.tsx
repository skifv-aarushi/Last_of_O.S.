import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Citizen {
    id: number;
    name: string; // Formatted as Name[Role]
    role: "CITIZEN" | "AUTHORITY" | "ATTACKER" | "AUDITOR"; // Added role field
    totalTasks: number;
    icon: string;
    onCooldown?: boolean;
    cooldownUntil?: number;
}

interface Certificate {
    id: number;
    taskName: string;
    score: number;
    status: string;
    author: string;
    authority: string;
    sigilIcon: string;
}

const FIRST_NAMES = ["ALEX", "SAM", "JORDAN", "TAYLOR", "CASEY", "MORGAN", "RILEY", "QUINN", "AVERY", "PHELPS", "BLAKE", "DREW", "REESE", "CAMERON", "SKYLER"];
const ROLES = ["CITIZEN", "AUTHORITY", "ATTACKER", "AUDITOR"] as const;

// Map roles to specific sprites
const ROLE_SPRITES: Record<string, string> = {
    "CITIZEN": "/citizen-sprite.png",
    "AUTHORITY": "/authority-sprite1.png",
    "ATTACKER": "/attacker-sprite1.png",
    "AUDITOR": "/auditor-sprites1.png"
};

const getRandomElement = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function AuditorTaskBay() {
    const navigate = useNavigate();

    // Sample data for citizens/authorities (left panel)
    const [citizens, setCitizens] = useState<Citizen[]>([]);

    useEffect(() => {
        // Generate random mock data
        const mockCitizens: Citizen[] = Array.from({ length: 20 }).map((_, i) => {
            const name = getRandomElement(FIRST_NAMES);
            const role = getRandomElement(ROLES);
            return {
                id: i + 1,
                name: `${name}[${role}]`, // Name[Role] format
                role: role,
                totalTasks: Math.floor(Math.random() * 50) + 1,
                icon: ROLE_SPRITES[role],
                onCooldown: false,
            };
        });
        setCitizens(mockCitizens);
    }, []);

    // Sample certificates for selected citizen (grid on right top)
    // Generating more to demonstrate scrolling
    const [certificates] = useState<Certificate[]>(
        Array.from({ length: 12 }).map((_, i) => ({
            id: i + 1,
            taskName: getRandomElement(["PID", "AIM", "TYPING", "MEMORY", "INVENTORY"]),
            score: Math.floor(Math.random() * 20) + 80,
            status: Math.random() > 0.3 ? "Approved" : "Pending",
            author: "[Name]",
            authority: "[Authority_ID]",
            sigilIcon: `/sigil_${(i % 5) + 1}.svg`,
        }))
    );

    const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
    const [selectedCertificate, setSelectedCertificate] = useState<Certificate>(certificates[0]);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Set initial selected citizen after generation
    useEffect(() => {
        if (citizens.length > 0 && !selectedCitizen) {
            setSelectedCitizen(citizens[0]);
        }
    }, [citizens, selectedCitizen]);

    const handleCooldown = () => {
        if (selectedCitizen?.role === "AUTHORITY") {
            setShowConfirmation(true);
        }
    };

    const handleConfirmCooldown = () => {
        if (!selectedCitizen || selectedCitizen.role !== "AUTHORITY") return;

        // Set cooldown for 5 minutes
        const cooldownTime = Date.now() + 5 * 60 * 1000;
        setCitizens(citizens.map(citizen =>
            citizen.id === selectedCitizen.id
                ? { ...citizen, onCooldown: true, cooldownUntil: cooldownTime }
                : citizen
        ));
        setShowConfirmation(false);

        // Auto-remove cooldown after 5 minutes
        setTimeout(() => {
            setCitizens(prev => prev.map(citizen =>
                citizen.id === selectedCitizen.id
                    ? { ...citizen, onCooldown: false, cooldownUntil: undefined }
                    : citizen
            ));
        }, 5 * 60 * 1000);
    };

    const handleCancelCooldown = () => {
        setShowConfirmation(false);
    };

    // Helper to determine cooldown button state
    const isCooldownDisabled = !selectedCitizen || selectedCitizen.role !== "AUTHORITY" || selectedCitizen.onCooldown;
    const cooldownButtonText = !selectedCitizen
        ? "COOLDOWN"
        : selectedCitizen.role !== "AUTHORITY"
            ? "N/A"
            : selectedCitizen.onCooldown
                ? "WAIT"
                : "COOLDOWN";

    return (
        <div
            className="relative w-full h-screen overflow-hidden bg-[#0a0a0a] select-none"
            style={{ fontFamily: "'Jura', sans-serif" }}
        >
            {/* Background image */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{
                    backgroundImage: "url('/aud_bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.4,
                }}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Exit button */}
            <button
                onClick={() => navigate("/auditor/play")}
                className="absolute top-6 left-6 z-30 px-4 py-2 border border-[#a855f7]/40 bg-black/50 text-[#a855f7] font-bold text-sm uppercase hover:bg-[#a855f7]/20 transition-colors"
            >
                ← EXIT
            </button>

            {/* Main content */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-start p-8 pt-16">
                {/* Title */}
                <h1 className="font-bold text-2xl uppercase tracking-wider mb-8 flex-shrink-0">
                    <span className="text-white">LOCATION : </span>
                    <span className="text-[#a855f7]" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>SIGIL WAREHOUSE</span>
                </h1>

                {/* Main layout */}
                <div className="flex items-start justify-center gap-8 w-full max-w-[1400px] h-[calc(100vh-140px)]">
                    {/* Left panel: RECORDS OF THE O.S. */}
                    <div className="relative w-[380px] h-full flex flex-col">
                        {/* Corner brackets */}
                        <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-white/30" />
                        <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-white/30" />
                        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-white/30" />
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-white/30" />

                        <div className="bg-black/40 border border-white/20 p-6 h-full flex flex-col">
                            <h2 className="font-bold text-base uppercase text-white mb-6 tracking-wide flex-shrink-0">
                                RECORDS OF THE O.S.
                            </h2>

                            {/* Citizens list - SCROLLABLE */}
                            <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                {citizens.map((citizen) => {
                                    const isSelected = selectedCitizen?.id === citizen.id;

                                    return (
                                        <button
                                            key={citizen.id}
                                            onClick={() => setSelectedCitizen(citizen)}
                                            className={`w-full flex items-center gap-3 p-3 border transition-all ${isSelected ? "border-[#a855f7] bg-[#a855f7]/10" : "border-white/20 bg-black/30 hover:bg-black/50"
                                                } ${citizen.onCooldown ? "opacity-40" : ""}`}
                                        >
                                            {/* Icon */}
                                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center border border-[#a855f7]/40 rounded bg-black/50 overflow-hidden">
                                                <img
                                                    src={citizen.icon}
                                                    alt={citizen.name}
                                                    className="w-full h-full object-contain"
                                                    style={{ imageRendering: "pixelated" }}
                                                />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 text-left">
                                                <p className="font-bold text-[11px] uppercase leading-tight">
                                                    <span className="text-white">NAME : </span>
                                                    <span className="text-[#a855f7]">{citizen.name}</span>
                                                </p>
                                                <p className="font-bold text-[11px] uppercase leading-tight mt-1">
                                                    <span className="text-white">TOTAL TASKS : </span>
                                                    <span className="text-[#a855f7]">{citizen.totalTasks}</span>
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right section: Two panels */}
                    <div className="flex flex-col gap-6 w-[700px] h-full">
                        {/* Top panel: ACTIVITY RECORD - SCROLLABLE */}
                        <div className="relative flex-1 min-h-0 flex flex-col">
                            {/* Corner brackets */}
                            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-white/30" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-white/30" />
                            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-white/30" />
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-white/30" />

                            <div className="bg-black/40 border border-white/20 p-6 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                    <h2 className="font-bold text-base uppercase tracking-wide">
                                        <span className="text-white">ACTIVITY </span>
                                        <span className="text-[#a855f7]" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>RECORD</span>
                                    </h2>

                                    {/* User info */}
                                    <div className="flex gap-8 text-[11px]">
                                        <span className="text-white">Name : <span className="text-[#a855f7]">{selectedCitizen?.name}</span></span>
                                    </div>
                                </div>

                                {/* Certificates grid - SCROLLABLE */}
                                <div className="grid grid-cols-3 gap-4 overflow-y-auto flex-1 content-start pr-2 custom-scrollbar">
                                    {certificates.map((cert) => {
                                        const isSelected = selectedCertificate.id === cert.id;
                                        return (
                                            <button
                                                key={cert.id}
                                                onClick={() => setSelectedCertificate(cert)}
                                                className={`w-full aspect-square shrink-0 flex flex-col items-center justify-center border-2 bg-black/50 transition-all hover:bg-black/70 p-4 ${isSelected ? "border-[#b484e0]" : "border-[#0a0a0a]/40"
                                                    }`}
                                            >
                                                <img
                                                    src={cert.sigilIcon}
                                                    alt={cert.taskName}
                                                    className="w-16 h-16 object-contain mb-3"
                                                    style={{ filter: "brightness(0) saturate(100%) invert(60%) sepia(77%) saturate(3098%) hue-rotate(240deg) brightness(100%) contrast(96%)" }}
                                                />
                                                <span className="font-bold text-xs uppercase text-white leading-none">
                                                    Task : <span className="text-[#a855f7]">{cert.taskName}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Bottom panel: SIGIL OF PROOF - FIXED SIZE */}
                        <div className="relative shrink-0">
                            {/* Corner brackets */}
                            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-white/30" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-white/30" />
                            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-white/30" />
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-white/30" />

                            <div className="bg-black/40 border border-white/20 p-6">
                                <h2 className="font-bold text-base uppercase text-[#a855f7] mb-6 text-center tracking-wide" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
                                    SIGIL OF PROOF
                                </h2>

                                <div className="flex items-start gap-10 h-[110px]">
                                    {/* Sigil icon with corner brackets */}
                                    <div className="relative flex-shrink-0">
                                        <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-[#a855f7]/60" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-[#a855f7]/60" />
                                        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-[#a855f7]/60" />
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-[#a855f7]/60" />

                                        <div className="w-28 h-28 flex items-center justify-center bg-black/30">
                                            <img
                                                src={selectedCertificate.sigilIcon}
                                                alt="Sigil"
                                                className="w-20 h-20 object-contain"
                                                style={{ filter: "brightness(0) saturate(100%) invert(60%) sepia(77%) saturate(3098%) hue-rotate(240deg) brightness(100%) contrast(96%)" }}
                                            />
                                        </div>
                                    </div>

                                    {/* Certificate details */}
                                    <div className="flex-1 space-y-2">
                                        <p className="font-bold text-[11px] uppercase leading-tight">
                                            <span className="text-white">Name : </span>
                                            <span className="text-[#a855f7]">{selectedCertificate.taskName}</span>
                                        </p>
                                        <p className="font-bold text-[11px] uppercase leading-tight">
                                            <span className="text-white">Score : </span>
                                            <span className="text-[#a855f7]">{selectedCertificate.score}</span>
                                        </p>
                                        <p className="font-bold text-[11px] uppercase leading-tight">
                                            <span className="text-white">Status : </span>
                                            <span className="text-[#a855f7]">{selectedCertificate.status}</span>
                                        </p>
                                        <p className="font-bold text-[11px] uppercase leading-tight">
                                            <span className="text-white">Author : </span>
                                            <span className="text-[#a855f7]">{selectedCertificate.author}</span>
                                        </p>
                                        <p className="font-bold text-[11px] uppercase leading-tight">
                                            <span className="text-white">Authority : </span>
                                            <span className="text-[#a855f7]">{selectedCertificate.authority}</span>
                                        </p>
                                    </div>

                                    {/* Cooldown button */}
                                    <div className="flex-shrink-0 flex items-end">
                                        <button
                                            onClick={handleCooldown}
                                            disabled={isCooldownDisabled}
                                            className={`px-6 py-2.5 border-2 font-bold text-xs uppercase transition-colors ${isCooldownDisabled
                                                ? "border-white/20 bg-black/30 text-white/30 cursor-not-allowed"
                                                : "border-[#a855f7] bg-black/50 text-[#a855f7] hover:bg-[#a855f7]/20"
                                                }`}
                                        >
                                            {cooldownButtonText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Screen */}
            {showConfirmation && selectedCitizen && (
                <div
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 animate-fade-in"
                    style={{ fontFamily: "'Jura', sans-serif" }}
                >
                    <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(168,85,247,0.08) 2px, rgba(168,85,247,0.08) 4px)' }}
                    />

                    <div className="absolute top-[30%] left-0 right-0 h-px bg-[#a855f7]/20" />
                    <div className="absolute top-[70%] left-0 right-0 h-px bg-[#a855f7]/20" />

                    <p className="text-[#a855f7]/60 text-xs uppercase tracking-[0.3em] mb-6">
                        // COOLDOWN CONFIRMATION
                    </p>

                    <h2 className="font-bold text-2xl sm:text-3xl text-[#a855f7] uppercase tracking-widest mb-3" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
                        INITIATE COOLDOWN
                    </h2>

                    <div className="flex gap-8 sm:gap-12 my-6">
                        <div className="text-center">
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">CITIZEN</p>
                            <p className="font-bold text-2xl sm:text-3xl text-[#a855f7]">{selectedCitizen.name}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">DURATION</p>
                            <p className="font-bold text-2xl sm:text-3xl text-[#a855f7]">5 MINS</p>
                        </div>
                    </div>

                    <p className="text-white/50 text-sm uppercase tracking-wider mb-8 max-w-md text-center">
                        This citizen will be greyed out and unavailable for 5 minutes
                    </p>

                    <div className="flex gap-4">
                        <button
                            onClick={handleConfirmCooldown}
                            className="px-8 py-3 border-2 border-[#a855f7] text-[#a855f7] font-bold text-sm uppercase tracking-wider hover:bg-[#a855f7]/20 transition-colors"
                            style={{ boxShadow: '0 0 15px rgba(168,85,247,0.2)' }}
                        >
                            CONFIRM
                        </button>
                        <button
                            onClick={handleCancelCooldown}
                            className="px-8 py-3 border-2 border-white/30 text-white/70 font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-colors"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(168, 85, 247, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(168, 85, 247, 0.5);
                }
            `}</style>
        </div>
    );
}
