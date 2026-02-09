import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import { getLedger, type LedgerEntry } from "@/lib/api";

interface PlayerStats {
    bestScore: string;
    certificates: string;
    averageScore: string;
    approved: string;
    rejected: string;
}

const NA_STATS: PlayerStats = {
    bestScore: "N/A",
    certificates: "N/A",
    averageScore: "N/A",
    approved: "N/A",
    rejected: "N/A",
};

// Placeholder description for Auditor class - adjusting to match the theme
const CLASS_DESCRIPTION =
    "The Auditors are the eyes of The Foundry. They scrutinize every action, every record, ensuring absolute compliance with the System's protocols. Precise, analytical, and unwavering, they maintain the order that keeps the O.S. running.";

export default function AuditorUserInfo() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<PlayerStats>(NA_STATS);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
            if (!u) navigate("/game");
        });
        return unsub;
    }, [navigate]);

    // Fetch player stats from ledger
    useEffect(() => {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId || !user) return;

        getLedger(sessionId)
            .then(({ entries }) => {
                const mine = entries.filter((e: LedgerEntry) => e.playerId === user.uid);
                if (mine.length === 0) return;

                const scores = mine.map((e) => e.score);
                const approved = mine.filter((e) => e.action === "approve").length;
                const rejected = mine.filter((e) => e.action === "reject").length;

                setStats({
                    bestScore: Math.max(...scores).toString(),
                    certificates: mine.length.toString(),
                    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length).toString(),
                    approved: approved.toString(),
                    rejected: rejected.toString(),
                });
            })
            .catch(() => { });
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-[#0a0e17] flex items-center justify-center">
                <span className="font-pixel text-sm text-[#a855f7] animate-pulse">LOADING...</span>
            </div>
        );
    }

    const displayName = user?.displayName ?? localStorage.getItem("playerName") ?? "UNKNOWN";
    const firstName = displayName.split(" ")[0];

    return (
        <div className="min-h-screen w-full bg-[#0a0e17] relative overflow-hidden"
            style={{ fontFamily: "'Jura', sans-serif" }}>
            {/* Full-screen background */}
            <img
                src="/auditor-user-info-bg.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Content overlay */}
            <div className="relative z-10 min-h-screen flex flex-col px-6 sm:px-10 md:px-16 py-6">
                {/* ── Title ── */}
                <h1 className="font-bold text-xl sm:text-2xl md:text-3xl text-white text-center mt-2 mb-5 uppercase tracking-widest">
                    WELCOME TO THE O.S.{" "}
                    <span className="text-[#a855f7]">{firstName.toUpperCase()}</span>
                </h1>

                {/* ── Class box ── */}
                <div className="w-full border border-[#a855f7]/30 bg-black/60 px-8 py-6 mb-6 relative">
                    <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-[#a855f7]" />
                    <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-[#a855f7]" />
                    <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-[#a855f7]" />
                    <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-[#a855f7]" />

                    <p className="font-bold text-lg sm:text-xl text-center mb-3 tracking-wide uppercase">
                        <span className="text-white">CLASS : </span>
                        <span className="text-[#a855f7]">AUDITOR</span>
                    </p>
                    <p className="font-[Jura] text-sm sm:text-base leading-relaxed text-gray-300 text-center max-w-4xl mx-auto">
                        {CLASS_DESCRIPTION}
                    </p>
                </div>

                {/* ── Main content: Player Info | Sprite | Conform text ── */}
                <div className="flex-1 flex flex-col md:flex-row items-stretch gap-4 justify-center">
                    {/* Left – Player Info card */}
                    <div className="md:w-[340px] shrink-0 border border-[#a855f7]/30 bg-black/60 p-6 sm:p-8 relative">
                        <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-[#a855f7]" />
                        <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-[#a855f7]" />
                        <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-[#a855f7]" />
                        <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-[#a855f7]" />

                        <h2 className="font-bold text-lg sm:text-xl mb-6 tracking-wide uppercase">
                            <span className="text-white">PLAYER </span>
                            <span className="text-[#a855f7]">INFO</span>
                        </h2>
                        <div className="space-y-4">
                            <StatRow label="BEST SCORE:" value={stats.bestScore} />
                            <StatRow label="CERTIFICATES:" value={stats.certificates} />
                            <StatRow label="AVERAGE SCORE:" value={stats.averageScore} />
                            <StatRow label="APPROVED:" value={stats.approved} />
                            <StatRow label="REJECTED:" value={stats.rejected} />
                        </div>
                    </div>

                    {/* Center – Character sprite */}
                    <div className="flex-1 flex items-center justify-center min-h-[300px]">
                        <img
                            src="/auditor-sprites1.png"
                            alt="Auditor"
                            className="h-[240px] sm:h-[300px] md:h-[360px] object-contain pixelated drop-shadow-[0_0_24px_rgba(168,85,247,0.3)]"
                        />
                    </div>

                    {/* Right – REVEL IN THE O.S. text grid (matched from figma screenshot "REVEL IN THE O.S.") */}
                    <div className="shrink-0 flex flex-col gap-2 justify-center hidden md:flex">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <span className="font-bold text-[10px] sm:text-xs whitespace-nowrap tracking-wider">
                                    <span className="text-gray-500">REVEL IN THE </span>
                                    <span className="text-[#a855f7]">O.S.</span>
                                </span>
                                <span className="font-bold text-[10px] sm:text-xs whitespace-nowrap tracking-wider">
                                    <span className="text-gray-500">REVEL IN THE </span>
                                    <span className="text-[#a855f7]">O.S.</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Back button ── */}
                <button
                    onClick={() => navigate("/auditor/play")}
                    className="mt-6 self-center px-10 py-3 bg-black/50 border border-[#a855f7]/50 text-[#a855f7] font-bold text-xs sm:text-sm hover:bg-[#a855f7]/10 transition-colors uppercase tracking-wider"
                >
                    BACK TO MAP
                </button>
            </div>
        </div>
    );
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <p className="font-bold text-xs sm:text-sm tracking-wide">
            <span className="text-white">{label}</span>{" "}
            <span className="text-[#a855f7]">{value}</span>
        </p>
    );
}
