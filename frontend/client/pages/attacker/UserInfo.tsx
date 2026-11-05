import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameGuard } from "@/hooks/use-game-guard";
import { auth, onAuthStateChanged, type User } from "@/lib/auth";
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

const CLASS_DESCRIPTION =
  "The Saboteurs are rogue agents embedded within The Foundry\u2019s ranks. Once loyal operatives, they have broken free of the System\u2019s control and now work to dismantle it from within. They are feared, hunted, and resourceful\u2014masters of deception and disruption.";

export default function AttackerUserInfo() {
  const navigate = useNavigate();
  useGameGuard("attacker");
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
        const approved = mine.filter((e) => e.action === "approved").length;
        const rejected = mine.filter((e) => e.action === "rejected").length;

        setStats({
          bestScore: Math.max(...scores).toString(),
          certificates: mine.length.toString(),
          averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length).toString(),
          approved: approved.toString(),
          rejected: rejected.toString(),
        });
      })
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0a0e17] flex items-center justify-center">
        <span className="font-pixel text-sm text-[#f97316] animate-pulse">LOADING...</span>
      </div>
    );
  }

  const displayName = user?.displayName ?? localStorage.getItem("playerName") ?? "UNKNOWN";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="min-h-screen w-full bg-[#0a0e17] relative overflow-hidden">
      {/* Full-screen background */}
      <img
        src="/attacker-user-info-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col px-6 sm:px-10 md:px-16 py-6">
        {/* ── Title ── */}
        <h1 className="font-pixel text-base sm:text-lg md:text-xl text-white text-center mt-2 mb-5">
          WELCOME TO THE O.S.{" "}
          <span className="text-[#f97316]">{firstName.toUpperCase()}</span>
        </h1>

        {/* ── Class box ── */}
        <div className="w-full border border-[#f97316]/30 bg-black/60 px-8 py-6 mb-6 relative">
          <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-[#f97316]" />
          <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-[#f97316]" />
          <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-[#f97316]" />
          <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-[#f97316]" />

          <p className="font-pixel text-base sm:text-lg text-center mb-3">
            <span className="text-white">CLASS : </span>
            <span className="text-[#f97316]">SABOTEUR</span>
          </p>
          <p className="font-[Jura] text-sm sm:text-base leading-relaxed text-gray-300 text-center">
            {CLASS_DESCRIPTION}
          </p>
        </div>

        {/* ── Main content: Player Info | Sprite | Conform text ── */}
        <div className="flex-1 flex flex-col md:flex-row items-stretch gap-4">
          {/* Left – Player Info card */}
          <div className="md:w-[340px] shrink-0 border border-[#f97316]/30 bg-black/60 p-6 sm:p-8 relative">
            <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-[#f97316]" />
            <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-[#f97316]" />
            <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-[#f97316]" />
            <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-[#f97316]" />

            <h2 className="font-pixel text-base sm:text-lg mb-6">
              <span className="text-white">PLAYER </span>
              <span className="text-[#f97316]">INFO</span>
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
          <div className="flex-1 flex items-center justify-center">
            <img
              src="/attacker-sprite3.png"
              alt="Saboteur"
              className="h-[240px] sm:h-[300px] md:h-[360px] object-contain pixelated drop-shadow-[0_0_24px_rgba(249,115,22,0.3)]"
            />
          </div>

          {/* Right – Conform to O.S. text grid */}
          <div className="shrink-0 flex flex-col gap-2 justify-center">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-pixel text-[10px] sm:text-xs whitespace-nowrap">
                  <span className="text-gray-400">RESIST THE </span>
                  <span className="text-[#f97316]">O.S.</span>
                </span>
                <span className="font-pixel text-[10px] sm:text-xs whitespace-nowrap">
                  <span className="text-gray-400">RESIST THE </span>
                  <span className="text-[#f97316]">O.S.</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Back button ── */}
        <button
          onClick={() => navigate("/attacker/play")}
          className="mt-6 self-center px-10 py-2 bg-black/50 border border-[#f97316]/50 text-[#f97316] font-pixel text-xs sm:text-sm hover:bg-[#f97316]/10 transition-colors uppercase"
        >
          BACK TO MAP
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="font-pixel text-xs sm:text-sm">
      <span className="text-white">{label}</span>{" "}
      <span className="text-[#f97316]">{value}</span>
    </p>
  );
}
