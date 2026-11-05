import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameGuard } from "@/hooks/use-game-guard";
import GameBanner from "@/components/GameBanner";
import { toast } from "sonner";
import { getPendingCertificates, processCertificate, type PendingCertificate } from "@/lib/api";

interface SigilTask {
  author: string;
  id: string;
  name: string;
  score: number;
  status: "pending" | "approved" | "rejected";
  sigilIcon: string;
}

export default function Authority() {
  const navigate = useNavigate();
  const { state: gameState } = useGameGuard("authority");

  const [tasks, setTasks] = useState<SigilTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch pending certificates from backend
  const fetchCerts = async () => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) { setLoading(false); return; }
    try {
      const { certificates } = await getPendingCertificates(sessionId);
      setTasks(certificates.map((c: PendingCertificate, i: number) => ({
        id: c.id,
        name: c.problemType,
        author: c.playerName,
        score: c.score,
        status: "pending" as const,
        sigilIcon: `/sigil_${(i % 5) + 1}.svg`,
      })));
    } catch (err) { console.error("Failed to fetch certificates", err); }
    setLoading(false);
  };

  // Keep the queue fresh while no decision is being confirmed
  useEffect(() => {
    if (showConfirmation) return;
    fetchCerts();
    const t = setInterval(fetchCerts, 5000);
    return () => clearInterval(t);
  }, [showConfirmation]);

  const [selectedTask, setSelectedTask] = useState<SigilTask | null>(tasks[0] ?? null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  // Auto-select first task when tasks load
  useEffect(() => {
    if (tasks.length > 0 && !selectedTask) setSelectedTask(tasks[0]);
  }, [tasks, selectedTask]);

  const handleApprove = async () => {
    if (!selectedTask) return;
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      try {
        await processCertificate(sessionId, selectedTask.id, "approve", selectedTask.score);
      } catch (err: any) {
        toast.error(err.message ?? "Could not process this certificate");
        fetchCerts();
        return;
      }
    }
    setTasks(tasks.map(task =>
      task.id === selectedTask.id ? { ...task, status: "approved" } : task
    ));
    setDecision("approved");
    setShowConfirmation(true);
  };

  const handleReject = async () => {
    if (!selectedTask) return;
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      try {
        await processCertificate(sessionId, selectedTask.id, "reject", selectedTask.score);
      } catch (err: any) {
        toast.error(err.message ?? "Could not process this certificate");
        fetchCerts();
        return;
      }
    }
    setTasks(tasks.map(task =>
      task.id === selectedTask.id ? { ...task, status: "rejected" } : task
    ));
    setDecision("rejected");
    setShowConfirmation(true);
  };

  const handleContinue = () => {
    setShowConfirmation(false);
    setDecision(null);
    // Optionally navigate to next task or refresh
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-[#0a0a0a] select-none"
      style={{ fontFamily: "'Jura', sans-serif" }}
    >
      {/* Background image (warehouse/server room) */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: "url('/auth_bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.4,
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      <GameBanner state={gameState} accent="#00ff00" compact />

      {/* Exit button */}
      <button
        onClick={() => navigate("/authority/play")}
        className="absolute top-6 left-6 z-30 px-4 py-2 border border-[#00ff00]/40 bg-black/50 text-[#00ff00] font-bold text-sm uppercase hover:bg-[#00ff00]/20 transition-colors"
      >
        ← EXIT
      </button>

      {/* Main content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-start p-8 pt-24">
        {/* Title */}
        <h1 className="font-bold text-2xl sm:text-3xl uppercase tracking-wider mb-12">
          <span className="text-white">LOCATION : </span>
          <span className="text-[#00ff00]" style={{ textShadow: '0 0 20px rgba(0,255,0,0.5)' }}>SIGIL WAREHOUSE</span>
        </h1>

        {/* Main layout - two sections */}
        <div className="flex items-start justify-center gap-8 w-full max-w-7xl">
          {/* Left section: History of Sigils */}
          <div className="relative flex-1 max-w-xl">
            {/* Corner brackets */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-white/30" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-white/30" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-white/30" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-white/30" />

            <div className="bg-black/40 border border-white/20 p-6 h-[calc(100vh-200px)] flex flex-col">
              <h2 className="font-bold text-xl uppercase text-white mb-6 tracking-wide flex-shrink-0">
                HISTORY OF SIGILS PRODUCED
              </h2>

              {/* Sigils list */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {tasks.map((task) => {
                  const getTaskStyle = () => {
                    if (task.status === "approved") {
                      return "border-[#00ff00] bg-[#00ff00]/20";
                    } else if (task.status === "rejected") {
                      return "border-[#ff6b6b] bg-[#ff6b6b]/20";
                    } else if (selectedTask?.id === task.id) {
                      return "border-[#00ff00] bg-[#00ff00]/10";
                    }
                    return "border-white/20 bg-black/30 hover:bg-black/50";
                  };

                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full flex items-center gap-4 p-4 border transition-all ${getTaskStyle()}`}
                    >
                      {/* Sigil icon */}
                      <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center border border-[#00ff00]/40 rounded bg-black/50">
                        <img
                          src={task.sigilIcon}
                          alt={`Sigil ${task.id}`}
                          className="w-12 h-12 object-contain"
                          style={{ filter: "brightness(0) saturate(100%) invert(69%) sepia(97%) saturate(1947%) hue-rotate(59deg) brightness(105%) contrast(109%)" }}
                        />
                      </div>

                      {/* Task info - show on all tasks */}
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm uppercase">
                          <span className="text-white">TASK: </span>
                          <span className="text-[#00ff00]">{task.name}</span>
                        </p>
                        <p className="font-bold text-sm uppercase mt-1">
                          <span className="text-white">SCORE: </span>
                          <span className="text-[#00ff00]">{task.score}</span>
                        </p>
                        {task.status !== "pending" && (
                          <p className={`font-bold text-xs uppercase mt-2 ${task.status === "approved" ? "text-[#00ff00]" : "text-[#ff6b6b]"
                            }`}>
                            {task.status === "approved" ? "✓ APPROVED" : "✗ REJECTED"}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right section: Sigil of Proof */}
          <div className="relative flex-1 max-w-md">
            {/* Corner brackets */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-white/30" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-white/30" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-white/30" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-white/30" />

            <div className="bg-black/40 border border-white/20 p-8 max-h-[600px] overflow-y-auto">
              <h2 className="font-bold text-xl uppercase text-[#00ff00] mb-8 text-center tracking-wide" style={{ textShadow: '0 0 20px rgba(0,255,0,0.5)' }}>
                SIGIL OF PROOF
              </h2>

              {/* Selected sigil details */}
              <div className="space-y-6">
                {/* Sigil icon - larger */}
                <div className="flex justify-center mb-8">
                  <div className="w-32 h-32 flex items-center justify-center border-2 border-[#00ff00]/40 rounded bg-black/50">
                    <img
                      src={selectedTask?.sigilIcon || '/sigil_1.svg'}
                      alt="Selected sigil"
                      className="w-24 h-24 object-contain"
                      style={{ filter: "brightness(0) saturate(100%) invert(69%) sepia(97%) saturate(1947%) hue-rotate(59deg) brightness(105%) contrast(109%)" }}
                    />
                  </div>
                </div>

                {/* Task details */}
                <div className="space-y-4">
                  <p className="font-bold text-lg uppercase">
                    <span className="text-white">Task Name : </span>
                    <span className="text-[#00ff00]">{selectedTask?.name ?? '—'}</span>
                  </p>
                  <p className="font-bold text-lg uppercase">
                    <span className="text-white">Author Name : </span>
                    <span className="text-[#00ff00]">{selectedTask?.author ?? '—'}</span>
                  </p>
                  <p className="font-bold text-lg uppercase">
                    <span className="text-white">Score : </span>
                    <span className="text-[#00ff00]">{selectedTask?.score ?? 0}</span>
                  </p>
                  <p className="font-bold text-lg uppercase">
                    <span className="text-white">Status : </span>
                    <span className="text-[#00ff00] capitalize">{selectedTask?.status ?? '—'}</span>
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-4 mt-8 pt-8 border-t border-white/20">
                  <button
                    onClick={handleReject}
                    className="flex-1 px-6 py-3 border-2 border-[#8b4513] bg-[#8b4513]/20 text-[#ff6b6b] font-bold text-sm uppercase hover:bg-[#8b4513]/40 transition-colors"
                  >
                    REJECT
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex-1 px-6 py-3 border-2 border-[#00ff00] bg-[#00ff00]/20 text-[#00ff00] font-bold text-sm uppercase hover:bg-[#00ff00]/30 transition-colors"
                    style={{ boxShadow: '0 0 15px rgba(0,255,0,0.2)' }}
                  >
                    APPROVE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Screen */}
      {showConfirmation && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 pointer-events-auto animate-fade-in"
          style={{ fontFamily: "'Jura', sans-serif" }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.08) 2px, rgba(0,255,0,0.08) 4px)' }}
          />

          <div className="absolute top-[30%] left-0 right-0 h-px bg-[#00ff00]/20" />
          <div className="absolute top-[70%] left-0 right-0 h-px bg-[#00ff00]/20" />

          <p className="text-[#00ff00]/60 text-xs uppercase tracking-[0.3em] mb-6">
            // DECISION RECORDED
          </p>

          <h2 className="font-bold text-2xl sm:text-3xl text-[#00ff00] uppercase tracking-widest mb-3" style={{ textShadow: '0 0 20px rgba(0,255,0,0.5)' }}>
            SIGIL {decision === "approved" ? "APPROVED" : "REJECTED"}
          </h2>

          <div className="flex gap-8 sm:gap-12 my-6">
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">TASK</p>
              <p className="font-bold text-3xl sm:text-4xl text-[#00ff00]">{selectedTask?.name ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">SCORE</p>
              <p className="font-bold text-3xl sm:text-4xl text-[#00ff00]">{selectedTask?.score ?? 0}</p>
            </div>
          </div>

          <div className={`px-6 py-3 border-2 mb-8 ${decision === "approved"
            ? "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00]"
            : "border-[#ff6b6b] bg-[#ff6b6b]/10 text-[#ff6b6b]"
            } font-bold text-lg uppercase`}>
            STATUS: {decision === "approved" ? "APPROVED" : "REJECTED"}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleContinue}
              className="px-8 py-3 border-2 border-[#00ff00] text-[#00ff00] font-bold text-sm uppercase tracking-wider hover:bg-[#00ff00]/20 transition-colors"
              style={{ boxShadow: '0 0 15px rgba(0,255,0,0.2)' }}
            >
              CONTINUE
            </button>
            <button
              onClick={() => navigate("/authority/play")}
              className="px-8 py-3 border-2 border-white/30 text-white/70 font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-colors"
            >
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 255, 0, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 0, 0.5); }
      `}</style>
    </div>
  );
}
