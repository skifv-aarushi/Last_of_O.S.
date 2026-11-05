import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, refreshToken, type User } from "@/lib/auth";
import { joinLobby, type GameState, type Role } from "@/lib/api";
import { useGameState } from "@/hooks/use-game-state";

export const ROLE_HOME: Record<Role, string> = {
  citizen: "/play",
  attacker: "/attacker/play",
  authority: "/authority/play",
  auditor: "/auditor/play",
};

/** Why the player can't start a task right now, or null if they can. */
export function taskBlockedReason(state: GameState | null): string | null {
  if (!state) return "Connecting to the game...";
  const now = Date.now();
  if (state.cooldownUntil > now) return `On cooldown for ${Math.ceil((state.cooldownUntil - now) / 1000)}s`;
  if (state.nextGameAt > now) return `Next task unlocks in ${Math.ceil((state.nextGameAt - now) / 1000)}s`;
  return null;
}

/**
 * Shared guard for every in-game page: requires sign-in, makes sure the player is in the open
 * game, and sends them to the right place for the game status and their assigned role.
 */
export function useGameGuard(expected: Role) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sessionId"));
  const { state, errorStatus } = useGameState(sessionId);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) navigate("/game", { replace: true });
    });
    return unsub;
  }, [navigate]);

  // Session tokens last 12 h; renew well before expiry
  useEffect(() => {
    const interval = setInterval(() => refreshToken(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // No (or stale) session -> go through the lobby to pick up the open game
  useEffect(() => {
    if (!user) return;
    if (!sessionId || errorStatus === 404) {
      localStorage.removeItem("sessionId");
      navigate("/lobby", { replace: true });
    }
  }, [user, sessionId, errorStatus, navigate]);

  useEffect(() => {
    if (!state || !user) return;
    if (!state.joined) {
      // the player was removed from the game
      joinLobby()
        .then((r) => { localStorage.setItem("sessionId", r.sessionId); setSessionId(r.sessionId); })
        .catch(() => navigate("/lobby", { replace: true }));
      return;
    }
    if (state.status === "waiting") navigate("/lobby", { replace: true });
    else if (state.status === "completed") navigate("/results", { replace: true });
    else if (state.playerRole && state.playerRole !== expected) navigate(ROLE_HOME[state.playerRole], { replace: true });
  }, [state, user, expected, navigate]);

  return { user, authLoading, sessionId, state };
}
