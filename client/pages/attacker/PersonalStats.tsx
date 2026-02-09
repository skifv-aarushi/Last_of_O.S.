import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";
import { getLedger, type LedgerEntry } from "@/lib/api";

// Map game routes → display names + sigil icons
const GAME_MAP: Record<string, { name: string; sigil: string }> = {
  "pid-tuning": { name: "PID", sigil: "/sigil_1.svg" },
  "visual-memory": { name: "MACHINE LEARNING", sigil: "/sigil_2.svg" },
  "typing-test": { name: "CODE CALIBRATION", sigil: "/sigil_3.svg" },
  "inventory-management": { name: "REGISTER INVENTORY", sigil: "/sigil_4.svg" },
  "aim-trainer": { name: "GLITCH TERMINATION", sigil: "/sigil_5.svg" },
};

const GAME_KEYS = Object.keys(GAME_MAP);

interface SigilEntry {
  key: string;
  name: string;
  sigil: string;
  score: number | null;
  status: string;
  author: string;
}

export default function AttackerPersonalStats() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<SigilEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) navigate("/game");
    });
    return unsub;
  }, [navigate]);

  // Build entries from ledger data
  useEffect(() => {
    const sessionId = localStorage.getItem("sessionId");
    const playerName =
      user?.displayName?.split(" ")[0] ??
      localStorage.getItem("playerName") ??
      "Unknown";

    // Default entries with N/A
    const defaults: SigilEntry[] = GAME_KEYS.map((k) => ({
      key: k,
      name: GAME_MAP[k].name,
      sigil: GAME_MAP[k].sigil,
      score: null,
      status: "N/A",
      author: playerName,
    }));

    if (!sessionId || !user) {
      setEntries(defaults);
      return;
    }

    getLedger(sessionId)
      .then(({ entries: ledger }) => {
        const mine = ledger.filter((e: LedgerEntry) => e.playerId === user.uid);

        // Group best score per game type by matching certificate patterns
        const scoreMap = new Map<string, { score: number; action: string }>();
        for (const entry of mine) {
          for (const gk of GAME_KEYS) {
            if (
              entry.certificateId.toLowerCase().includes(gk.replace("-", "")) ||
              entry.certificateId.toLowerCase().includes(gk)
            ) {
              const existing = scoreMap.get(gk);
              if (!existing || entry.score > existing.score) {
                scoreMap.set(gk, { score: entry.score, action: entry.action });
              }
            }
          }
        }

        // If we can't match by certificate ID, just assign in order
        if (scoreMap.size === 0 && mine.length > 0) {
          mine.slice(0, GAME_KEYS.length).forEach((e, i) => {
            if (GAME_KEYS[i]) {
              scoreMap.set(GAME_KEYS[i], { score: e.score, action: e.action });
            }
          });
        }

        const result = defaults.map((d) => {
          const data = scoreMap.get(d.key);
          if (data) {
            return {
              ...d,
              score: data.score,
              status: data.action === "approve" ? "Approved" : data.action === "reject" ? "Rejected" : "Pending",
            };
          }
          return d;
        });

        setEntries(result);
      })
      .catch(() => {
        setEntries(defaults);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0a0e17] flex items-center justify-center">
        <span className="font-pixel text-sm text-[#f97316] animate-pulse">LOADING...</span>
      </div>
    );
  }

  const selected = entries[selectedIdx] ?? entries[0];

  return (
    <div className="min-h-screen w-full bg-[#0a0e17] relative overflow-hidden">
      {/* Full-screen background */}
      <img
        src="/attacker-personal-stats-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col px-6 sm:px-10 md:px-16 py-6">
        {/* ── Title ── */}
        <h1 className="font-pixel text-base sm:text-lg md:text-xl text-white text-center mt-2 mb-6">
          LOCATION :{" "}
          <span className="text-[#f97316]">SIGIL WAREHOUSE</span>
        </h1>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 items-center justify-center">
          {/* Left – History of Sigils */}
          <div className="w-[640px] shrink-0 border border-[#f97316]/30 bg-black/60 p-4 sm:p-5 relative flex flex-col">
            <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-[#f97316]" />
            <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-[#f97316]" />
            <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-[#f97316]" />
            <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-[#f97316]" />

            <h2 className="font-pixel text-xs sm:text-sm text-white mb-4">
              HISTORY OF SIGILS PRODUCED
            </h2>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 sigil-scroll-orange">
              {entries.map((entry, i) => (
                <button
                  key={entry.key}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-4 p-3 border transition-all text-left ${selectedIdx === i
                    ? "border-[#f97316] bg-[#f97316]/10"
                    : "border-[#f97316]/20 bg-black/30 hover:border-[#f97316]/40 hover:bg-black/40"
                    }`}
                >
                  <img
                    src={entry.sigil}
                    alt={entry.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    style={{ filter: "brightness(0) saturate(100%) invert(50%) sepia(100%) saturate(5000%) hue-rotate(360deg) brightness(105%) contrast(95%)" }}
                  />
                  <div>
                    <p className="font-pixel text-[10px] sm:text-xs">
                      <span className="text-white">TASK: </span>
                      <span className="text-[#f97316]">{entry.name}</span>
                    </p>
                    <p className="font-pixel text-[10px] sm:text-xs mt-1">
                      <span className="text-white">SCORE: </span>
                      <span className="text-[#f97316]">
                        {entry.score !== null ? entry.score : "N/A"}
                      </span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right – Sigil of Proof */}
          <div className="w-auto max-w-[420px] shrink-0 border border-[#f97316]/30 bg-black/60 p-4 sm:p-5 relative flex flex-col items-center justify-center">
            <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-[#f97316]" />
            <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-[#f97316]" />
            <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-[#f97316]" />
            <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-[#f97316]" />

            <h2 className="font-pixel text-xs sm:text-sm text-white mb-6 text-center w-full">
              SIGIL OF{" "}
              <span className="text-[#f97316]">PROOF</span>
            </h2>

            {selected && (
              <div className="flex flex-row items-center gap-4 flex-1 justify-center">
                {/* Large sigil on left with corner brackets */}
                <div className="relative w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] flex items-center justify-center shrink-0">
                  <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#f97316]" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#f97316]" />
                  <img
                    src={selected.sigil}
                    alt={selected.name}
                    className="w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] object-contain drop-shadow-[0_0_20px_rgba(249,115,22,0.25)]"
                    style={{ filter: "brightness(0) saturate(100%) invert(50%) sepia(100%) saturate(5000%) hue-rotate(360deg) brightness(105%) contrast(95%)" }}
                  />
                </div>

                {/* Details on right */}
                <div className="space-y-2 w-[160px]">
                  <DetailRow label="Task" value={selected.name} />
                  <DetailRow
                    label="Score"
                    value={selected.score !== null ? selected.score.toString() : "N/A"}
                  />
                  <DetailRow label="Status" value={selected.status} />
                  <DetailRow label="Author" value={selected.author} />
                </div>
              </div>
            )}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="font-pixel text-[10px] sm:text-xs flex">
      <span className="text-gray-400 shrink-0">{label} : </span>
      <span className="text-[#f97316] truncate">{value}</span>
    </p>
  );
}
