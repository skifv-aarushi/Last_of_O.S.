import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { requestLoginCode, verifyLoginCode, auth, onAuthStateChanged } from "@/lib/auth";
import { joinLobby } from "@/lib/api";

export default function Game() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Already signed in -> straight to the lobby, which routes by game status and role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !loading) {
        navigate("/lobby", { replace: true });
      }
      setAuthChecking(false);
    });
    return unsub;
  }, [navigate, loading]);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestLoginCode(email.trim().toLowerCase());
      setCodeSent(true);
      setCode("");
    } catch (err: any) {
      setError(err.message ?? "Could not send the code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyLoginCode(email.trim().toLowerCase(), code.trim());
      // Everyone shares one open game; join it (or start a fresh lobby if none exists)
      const { sessionId } = await joinLobby();
      localStorage.setItem("sessionId", sessionId);
      navigate("/lobby", { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking initial auth state
  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center">
        <span className="font-pixel text-sm text-pixel-cyan animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center overflow-hidden relative">
      {/* Background image - pixel art cityscape */}
      <img
        src="https://api.builder.io/api/v1/image/assets/TEMP/37dd726e68a0725cf6d40157a803bb41645d6400?width=2880"
        alt="Cyberpunk pixel art cityscape"
        className="absolute inset-0 w-full h-full object-cover pixelated"
      />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h1 className="font-tiny text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-pixel-cream text-center leading-tight mb-8 sm:mb-12 md:mb-16">
          THE LAST
          <br />
          OF O.S
        </h1>

        {/* Login Form Container */}
        <div className="w-full max-w-md bg-black/60 border-2 sm:border-3 border-pixel-cyan p-6 sm:p-8 md:p-10">
          {/* Heading */}
          <h2 className="font-pixel text-base sm:text-lg md:text-xl text-white text-center mb-6 sm:mb-8">
            PLAYER
            <br />
            LOGIN
          </h2>

          {!codeSent ? (
            <form onSubmit={handleSendCode} className="space-y-3">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@vitstudent.ac.in"
                className="w-full py-2 px-3 bg-black/50 border-2 border-pixel-cyan/60 text-white font-pixel text-xs outline-none focus:border-pixel-cyan"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-transparent border-2 border-pixel-cyan text-pixel-cyan font-pixel text-xs sm:text-sm hover:bg-pixel-cyan/20 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "SENDING..." : "EMAIL ME A CODE"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-3">
              <p className="font-pixel text-[10px] text-gray-300 text-center">
                CODE SENT TO {email.toUpperCase()}
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full py-2 px-3 bg-black/50 border-2 border-pixel-cyan/60 text-white text-center tracking-[0.5em] font-pixel text-lg outline-none focus:border-pixel-cyan"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-transparent border-2 border-pixel-cyan text-pixel-cyan font-pixel text-xs sm:text-sm hover:bg-pixel-cyan/20 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "CHECKING..." : "ENTER"}
              </button>
              <div className="flex justify-between font-pixel text-[10px] text-pixel-cyan">
                <button type="button" onClick={() => { setCodeSent(false); setError(null); }} className="underline">
                  CHANGE EMAIL
                </button>
                <button type="button" onClick={() => handleSendCode()} disabled={loading} className="underline">
                  RESEND CODE
                </button>
              </div>
            </form>
          )}

          {error && (
            <p className="mt-3 font-pixel text-[10px] sm:text-xs text-red-400 text-center">
              {error}
            </p>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="mt-8 sm:mt-12 px-5 py-2 bg-black/50 border border-pixel-cyan/40 font-pixel text-xs sm:text-sm text-pixel-cyan hover:bg-pixel-cyan/20 hover:text-white transition-colors uppercase tracking-wider"
        >
          BACK
        </button>
      </div>
    </div>
  );
}
