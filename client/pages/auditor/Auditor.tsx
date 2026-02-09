import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface IOCReport {
  id: number;
  name: string;
  score: number;
  status: "pending" | "approved" | "rejected";
  iocIcon: string;
  civilianId: string;
}

export default function Auditor() {
  const navigate = useNavigate();

  // Sample data - replace with actual data from API/state
  const [reports, setReports] = useState<IOCReport[]>([
    { id: 1, name: "IOC-ALPHA", score: 87, status: "pending", iocIcon: "/auth_ioc.svg", civilianId: "CITIZEN-0001" },
    { id: 2, name: "IOC-BETA", score: 92, status: "pending", iocIcon: "/auth_ioc.svg", civilianId: "CITIZEN-0002" },
    { id: 3, name: "IOC-GAMMA", score: 78, status: "pending", iocIcon: "/auth_ioc.svg", civilianId: "CITIZEN-0003" },
    { id: 4, name: "IOC-DELTA", score: 95, status: "pending", iocIcon: "/auth_ioc.svg", civilianId: "CITIZEN-0004" },
    { id: 5, name: "IOC-EPSILON", score: 83, status: "pending", iocIcon: "/auth_ioc.svg", civilianId: "CITIZEN-0005" },
  ]);

  const [selectedReport, setSelectedReport] = useState<IOCReport>(reports[0]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const handleApprove = () => {
    console.log("Approved:", selectedReport);
    // Update the report status
    setReports(reports.map(report =>
      report.id === selectedReport.id ? { ...report, status: "approved" } : report
    ));
    setDecision("approved");
    setShowConfirmation(true);
  };

  const handleReject = () => {
    console.log("Rejected:", selectedReport);
    // Update the report status
    setReports(reports.map(report =>
      report.id === selectedReport.id ? { ...report, status: "rejected" } : report
    ));
    setDecision("rejected");
    setShowConfirmation(true);
  };

  const handleContinue = () => {
    setShowConfirmation(false);
    setDecision(null);
    // Optionally navigate to next report or refresh
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-[#0a0a0a] select-none"
      style={{ fontFamily: "'Jura', sans-serif" }}
    >
      {/* Background image (audit room) */}
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
        onClick={() => navigate("/play")}
        className="absolute top-6 left-6 z-30 px-4 py-2 border border-[#a855f7]/40 bg-black/50 text-[#a855f7] font-bold text-sm uppercase hover:bg-[#a855f7]/20 transition-colors"
      >
        ← EXIT
      </button>

      {/* Main content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-start p-8 pt-24">
        {/* Title */}
        <h1 className="font-bold text-2xl sm:text-3xl uppercase tracking-wider mb-12">
          <span className="text-white">LOCATION : </span>
          <span className="text-[#a855f7]" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>AUDIT CHAMBER</span>
        </h1>

        {/* Main layout - two sections */}
        <div className="flex items-start justify-center gap-8 w-full max-w-7xl">
          {/* Left section: History of IOC Reports */}
          <div className="relative flex-1 max-w-xl">
            {/* Corner brackets */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-white/30" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-white/30" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-white/30" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-white/30" />

            <div className="bg-black/40 border border-white/20 p-6">
              <h2 className="font-bold text-xl uppercase text-white mb-6 tracking-wide">
                HISTORY OF IOC REPORTS
              </h2>

              {/* Reports list */}
              <div className="space-y-3">
                {reports.map((report) => {
                  const getReportStyle = () => {
                    if (report.status === "approved") {
                      return "border-[#a855f7] bg-[#a855f7]/20";
                    } else if (report.status === "rejected") {
                      return "border-[#ff6b6b] bg-[#ff6b6b]/20";
                    } else if (selectedReport.id === report.id) {
                      return "border-[#a855f7] bg-[#a855f7]/10";
                    }
                    return "border-white/20 bg-black/30 hover:bg-black/50";
                  };

                  return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full flex items-center gap-4 p-4 border transition-all ${getReportStyle()}`}
                  >
                    {/* IOC icon */}
                    <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center border border-[#a855f7]/40 rounded bg-black/50">
                      <img
                        src={report.iocIcon}
                        alt={`IOC ${report.id}`}
                        className="w-12 h-12 object-contain"
                        style={{ filter: "brightness(0) saturate(100%) invert(60%) sepia(77%) saturate(3098%) hue-rotate(240deg) brightness(100%) contrast(96%)" }}
                      />
                    </div>

                    {/* Report info - show on all reports */}
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm uppercase">
                        <span className="text-white">REPORT: </span>
                        <span className="text-[#a855f7]">{report.name}</span>
                      </p>
                      <p className="font-bold text-sm uppercase mt-1">
                        <span className="text-white">SCORE: </span>
                        <span className="text-[#a855f7]">{report.score}</span>
                      </p>
                      {report.status !== "pending" && (
                        <p className={`font-bold text-xs uppercase mt-2 ${
                          report.status === "approved" ? "text-[#a855f7]" : "text-[#ff6b6b]"
                        }`}>
                          {report.status === "approved" ? "✓ APPROVED" : "✗ REJECTED"}
                        </p>
                      )}
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right section: Report Details */}
          <div className="relative flex-1 max-w-md">
            {/* Corner brackets */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-white/30" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-white/30" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-white/30" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-white/30" />

            <div className="bg-black/40 border border-white/20 p-8 max-h-[600px] overflow-y-auto">
              <h2 className="font-bold text-xl uppercase text-[#a855f7] mb-8 text-center tracking-wide" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
                IOC REPORT DETAILS
              </h2>

              {/* Selected report details */}
              <div className="space-y-6">
                {/* IOC icon - larger */}
                <div className="flex justify-center mb-8">
                  <div className="w-32 h-32 flex items-center justify-center border-2 border-[#a855f7]/40 rounded bg-black/50">
                    <img
                      src={selectedReport.iocIcon}
                      alt="Selected IOC"
                      className="w-24 h-24 object-contain"
                      style={{ filter: "brightness(0) saturate(100%) invert(60%) sepia(77%) saturate(3098%) hue-rotate(240deg) brightness(100%) contrast(96%)" }}
                    />
                  </div>
                </div>

                {/* Report details */}
                <div className="space-y-4">
                  <p className="font-bold text-lg uppercase">
                    <span className="text-white">Report Name : </span>
                    <span className="text-[#a855f7]">{selectedReport.name}</span>
                  </p>

                  {/* Civilian info with icon */}
                  <div className="font-bold text-lg uppercase flex items-center gap-3">
                    <span className="text-white">Civilian : </span>
                    <div className="flex items-center gap-2">
                      <img
                        src="/civillian_icon.png"
                        alt="Civilian"
                        className="w-6 h-6 object-contain"
                      />
                      <span className="text-[#a855f7]">{selectedReport.civilianId}</span>
                    </div>
                  </div>

                  <p className="font-bold text-lg uppercase">
                    <span className="text-white">Score : </span>
                    <span className="text-[#a855f7]">{selectedReport.score}</span>
                  </p>
                  <p className="font-bold text-lg uppercase">
                    <span className="text-white">Status : </span>
                    <span className="text-[#a855f7] capitalize">{selectedReport.status}</span>
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
                    className="flex-1 px-6 py-3 border-2 border-[#a855f7] bg-[#a855f7]/20 text-[#a855f7] font-bold text-sm uppercase hover:bg-[#a855f7]/30 transition-colors"
                    style={{ boxShadow: '0 0 15px rgba(168,85,247,0.2)' }}
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
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(168,85,247,0.08) 2px, rgba(168,85,247,0.08) 4px)' }}
          />

          <div className="absolute top-[30%] left-0 right-0 h-px bg-[#a855f7]/20" />
          <div className="absolute top-[70%] left-0 right-0 h-px bg-[#a855f7]/20" />

          <p className="text-[#a855f7]/60 text-xs uppercase tracking-[0.3em] mb-6">
            // DECISION RECORDED
          </p>

          <h2 className="font-bold text-2xl sm:text-3xl text-[#a855f7] uppercase tracking-widest mb-3" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
            IOC REPORT {decision === "approved" ? "APPROVED" : "REJECTED"}
          </h2>

          <div className="flex gap-8 sm:gap-12 my-6">
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">REPORT</p>
              <p className="font-bold text-3xl sm:text-4xl text-[#a855f7]">{selectedReport.name}</p>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">SCORE</p>
              <p className="font-bold text-3xl sm:text-4xl text-[#a855f7]">{selectedReport.score}</p>
            </div>
          </div>

          <div className={`px-6 py-3 border-2 mb-8 ${
            decision === "approved"
              ? "border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7]"
              : "border-[#ff6b6b] bg-[#ff6b6b]/10 text-[#ff6b6b]"
          } font-bold text-lg uppercase`}>
            STATUS: {decision === "approved" ? "APPROVED" : "REJECTED"}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleContinue}
              className="px-8 py-3 border-2 border-[#a855f7] text-[#a855f7] font-bold text-sm uppercase tracking-wider hover:bg-[#a855f7]/20 transition-colors"
              style={{ boxShadow: '0 0 15px rgba(168,85,247,0.2)' }}
            >
              CONTINUE
            </button>
            <button
              onClick={() => navigate("/play")}
              className="px-8 py-3 border-2 border-white/30 text-white/70 font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-colors"
            >
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
