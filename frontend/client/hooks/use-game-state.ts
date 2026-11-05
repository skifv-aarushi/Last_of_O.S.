import { useEffect, useRef, useState, useCallback } from "react";
import { ApiError, getGameState, type GameState } from "@/lib/api";

const POLL_INTERVAL = 3000; // 3 s

/**
 * Polls the backend for fresh game state every few seconds.
 * Returns { state, loading, error, errorStatus, refetch }.
 */
export function useGameState(sessionId: string | null) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getGameState(sessionId);
      setState(data);
      setError(null);
      setErrorStatus(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch game state");
      setErrorStatus(err instanceof ApiError ? err.status : null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    setState(null);
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchState();
    intervalRef.current = setInterval(fetchState, POLL_INTERVAL);
    const onVisible = () => document.visibilityState === "visible" && fetchState();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionId, fetchState]);

  return { state, loading, error, errorStatus, refetch: fetchState };
}
