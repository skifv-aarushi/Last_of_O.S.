import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, signOut, type User } from "@/lib/auth";
import { getLeaderboard, joinLobby, type LeaderboardEntry } from "@/lib/api";
import { useGameState } from "@/hooks/use-game-state";
import { ROLE_HOME } from "@/hooks/use-game-guard";
import { PixelButton, PixelHeading, PixelPanel, ROLE_STYLE } from "@/components/pixel";

const REVEAL_MS = 4000;

/** Waiting room: players sit here until an admin starts the game, then see their role and enter their map. */
export default function Lobby() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sessionId"));
  const [error, setError] = useState<string | null>(null);
  const [roster, setRoster] = useState<LeaderboardEntry[]>([]);
  const [reveal, setReveal] = useState(false);
  const [countdown, setCountdown] = useState(Math.round(REVEAL_MS / 1000));
  const sawWaiting = useRef(false);
  const { state, errorStatus } = useGameState(sessionId);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/game", { replace: true });
    });
    return unsub;
  }, [navigate]);

  const join = () => {
    setError(null);
    joinLobby()
      .then((r) => { localStorage.setItem("sessionId", r.sessionId); setSessionId(r.sessionId); })
      .catch((e) => setError(e.message ?? "Could not join the game"));
  };

  // join when there's no session, the stored one no longer exists, or it has already ended
  useEffect(() => {
    if (!user) return;
    if (!sessionId || errorStatus === 404 || state?.status === "completed" || (state && !state.joined)) join();
  }, [user, sessionId, errorStatus, state?.status, state?.joined]);

  // who else is waiting
  useEffect(() => {
    if (!sessionId || !state?.joined || state.status !== "waiting") return;
    const load = () => getLeaderboard(sessionId).then((r) => setRoster(r.leaderboard)).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [sessionId, state?.joined, state?.status]);

  // game start: show the role card for a few seconds, then drop the player on their map
  useEffect(() => {
    if (!state?.joined) return;
    if (state.status === "waiting") { sawWaiting.current = true; return; }
    if (state.status !== "active" || !state.playerRole) return;
    const go = () => navigate(ROLE_HOME[state.playerRole!], { replace: true });
    if (!sawWaiting.current) { go(); return; } // opened mid-game: no ceremony
    setReveal(true);
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const done = setTimeout(go, REVEAL_MS);
    return () => { clearInterval(tick); clearTimeout(done); };
  }, [state?.status, state?.joined, state?.playerRole, navigate]);

  const me = user?.uid;
  const role = state?.playerRole ?? null;
  const roleStyle = role ? ROLE_STYLE[role] : null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0e17]">
      <img src="/lab-scene.png" alt="" className="absolute inset-0 h-full w-full object-fill pixelated opacity-40" />
      <div className="absolute inset-0 bg-black/60" />

      {state?.announcement && (
        <div className="absolute z-30 top-0 inset-x-0 bg-yellow-400/90 text-black font-pixel text-[10px] sm:text-xs text-center px-3 py-2">
          {state.announcement}
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-8">
        <h1 className="font-tiny text-4xl sm:text-5xl md:text-6xl text-pixel-cream text-center leading-tight">
          THE LAST
          <br />
          OF O.S
        </h1>

        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-4">
          {/* Status */}
          <PixelPanel className="md:flex-1 p-6 sm:p-8 flex flex-col items-center text-center">
            <PixelHeading white="WAITING" accent="ROOM" className="mb-6" />
            <img
              src="/citizen-sprite.png"
              alt=""
              className="h-40 sm:h-52 object-contain pixelated drop-shadow-[0_0_24px_rgba(0,229,255,0.3)] mb-6"
            />
            <p className="font-pixel text-xs sm:text-sm text-white leading-relaxed">
              WAITING FOR AN ADMIN
              <br />
              TO START THE GAME<span className="text-pixel-cyan animate-pulse">...</span>
            </p>
            <p className="font-pixel text-xs text-pixel-cyan mt-5">
              {state ? `${state.totalPlayers} OPERATOR${state.totalPlayers === 1 ? "" : "S"} IN THE LOBBY` : "CONNECTING..."}
            </p>
            <p className="font-jura text-sm text-gray-300 mt-5 max-w-xs">
              Welcome, <span className="text-white">{user?.displayName ?? "operator"}</span>. Your class is revealed the moment the game begins.
              Keep this page open.
            </p>
            {error && (
              <div className="mt-4">
                <p className="font-jura text-sm text-red-300 mb-2">{error}</p>
                <PixelButton onClick={join}>RETRY</PixelButton>
              </div>
            )}
          </PixelPanel>

          {/* Roster */}
          <PixelPanel className="md:w-[320px] p-6 flex flex-col">
            <PixelHeading white="OPERATORS" accent="ONLINE" className="mb-4 !text-sm" />
            <ul className="flex-1 max-h-72 md:max-h-[22rem] overflow-y-auto space-y-1 pr-1">
              {roster.length === 0 && <li className="font-jura text-sm text-gray-500">No one else yet.</li>}
              {roster.map((p) => (
                <li
                  key={p.playerId}
                  className={`flex items-center justify-between font-jura text-sm px-2 py-1 border-l-2 bg-white/5 ${
                    p.playerId === me ? "border-pixel-cyan text-white" : "border-gray-600 text-gray-300"
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.playerId === me && <span className="font-pixel text-[9px] text-pixel-cyan ml-2">YOU</span>}
                </li>
              ))}
            </ul>
          </PixelPanel>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {user?.isAdmin && (
            <Link to="/admin">
              <PixelButton accent="#facc15">ADMIN PANEL</PixelButton>
            </Link>
          )}
          <Link to="/how-to-play">
            <PixelButton>HOW TO PLAY</PixelButton>
          </Link>
          <PixelButton onClick={() => signOut()}>SIGN OUT</PixelButton>
        </div>
      </div>

      {/* Role reveal when the admin starts the game */}
      {reveal && roleStyle && role && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="font-pixel text-xs sm:text-sm text-gray-400">THE GAME HAS BEGUN. YOUR CLASS:</p>
          <img
            src={roleStyle.sprite}
            alt={role}
            className="h-52 sm:h-72 object-contain pixelated"
            style={{ filter: `drop-shadow(0 0 28px ${roleStyle.color}88)` }}
          />
          <h2 className="font-pixel text-2xl sm:text-4xl" style={{ color: roleStyle.color }}>
            {role.toUpperCase()}
          </h2>
          <p className="font-jura text-sm sm:text-base text-gray-300 max-w-md">{roleStyle.blurb}</p>
          <p className="font-pixel text-xs text-white animate-pulse">ENTERING IN {countdown}...</p>
        </div>
      )}
    </div>
  );
}
