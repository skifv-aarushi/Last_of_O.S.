import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, signOut, type User } from "@/lib/auth";
import { joinLobby } from "@/lib/api";
import { useGameState } from "@/hooks/use-game-state";
import { ROLE_HOME } from "@/hooks/use-game-guard";

/** Waiting room: joins the open game, then forwards to the right map when the game starts. */
export default function Lobby() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sessionId"));
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (state?.joined && state.status === "active" && state.playerRole) {
      navigate(ROLE_HOME[state.playerRole], { replace: true });
    }
  }, [state, navigate]);

  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-black/60 border-2 border-pixel-cyan p-8 text-center">
        <h1 className="font-tiny text-4xl text-pixel-cream mb-6">THE LAST OF O.S</h1>
        <p className="font-pixel text-sm text-white mb-2">WAITING FOR THE GAME TO START</p>
        <p className="font-pixel text-xs text-pixel-cyan animate-pulse mb-6">
          {state ? `${state.totalPlayers} PLAYER${state.totalPlayers === 1 ? "" : "S"} IN LOBBY` : "CONNECTING..."}
        </p>
        {state?.announcement && (
          <p className="font-pixel text-xs bg-yellow-400/90 text-black px-3 py-2 mb-6">{state.announcement}</p>
        )}
        <p className="font-pixel text-[10px] text-gray-400 mb-6">
          SIGNED IN AS {user?.displayName?.toUpperCase() ?? "..."}
          <br />
          YOUR ROLE IS REVEALED WHEN THE GAME BEGINS
        </p>
        {error && (
          <div className="mb-4">
            <p className="font-pixel text-[10px] text-red-400 mb-2">{error}</p>
            <button onClick={join} className="font-pixel text-xs text-pixel-cyan border border-pixel-cyan px-3 py-1">RETRY</button>
          </div>
        )}
        <div className="flex justify-center gap-3">
          {user?.isAdmin && (
            <Link to="/admin" className="font-pixel text-xs text-yellow-300 border border-yellow-300/50 px-3 py-2 hover:bg-yellow-300/10">
              ADMIN
            </Link>
          )}
          <button
            onClick={() => signOut()}
            className="font-pixel text-xs text-pixel-cyan border border-pixel-cyan/50 px-3 py-2 hover:bg-pixel-cyan/10"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  );
}
