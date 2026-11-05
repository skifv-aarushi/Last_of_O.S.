/**
 * YANTRA 2026 – API client
 * Talks to the Vercel serverless API (/api).
 */

import { signOut } from "./auth";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "";

// ---------- helpers ----------

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  // an expired/invalid session token: drop it so the route guards send the player to login
  if (res.status === 401 && token) await signOut();

  const json = await res.json();
  if (!res.ok) throw new ApiError(json.detail ?? json.error ?? res.statusText, res.status, json);
  return json as T;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// ---------- Auth ----------

export async function verifyToken(idToken: string) {
  return request<{ success: boolean; uid: string }>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export async function registerUser(email: string, displayName: string) {
  return request<{
    success: boolean;
    userId: string;
    message: string;
    tempPassword: string;
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, displayName }),
  });
}

// ---------- Lobby ----------

export type Role = "citizen" | "attacker" | "authority" | "auditor";

export async function getLobby() {
  return request<{
    success: boolean;
    sessionId: string | null;
    status?: "waiting" | "active" | "completed";
    joined?: boolean;
    role?: Role | null;
    totalPlayers?: number;
    isAdmin: boolean;
  }>("/api/lobby");
}

export async function joinLobby() {
  return request<{ success: boolean; sessionId: string; status: string; role: Role }>(
    "/api/lobby/join",
    { method: "POST", body: JSON.stringify({}) }
  );
}

// ---------- Game state ----------

export async function getGameState(sessionId: string) {
  return request<GameState>(`/api/session/${sessionId}/state`);
}

export async function getLeaderboard(sessionId: string) {
  return request<{
    success: boolean;
    leaderboard: LeaderboardEntry[];
  }>(`/api/session/${sessionId}/leaderboard`);
}

// ---------- Minigames ----------

export async function getMinigame(sessionId: string) {
  return request<{
    success: boolean;
    problemId: string;
    problem: MinigameProblem;
    timeLimit: number;
  }>(`/api/session/${sessionId}/minigame`);
}

export async function submitMinigame(
  sessionId: string,
  problemId: string,
  answer: number,
  infectionLevel?: "none" | "minor" | "major"
) {
  return request<{
    success: boolean;
    certificateId: string;
    score: number;
    bufferTime: number;
  }>(`/api/session/${sessionId}/minigame/submit`, {
    method: "POST",
    body: JSON.stringify({ problemId, answer, infectionLevel }),
  });
}

// ---------- Authority ----------

export async function getPendingCertificates(sessionId: string) {
  return request<{
    success: boolean;
    certificates: PendingCertificate[];
  }>(`/api/session/${sessionId}/certificates/pending`);
}

export async function processCertificate(
  sessionId: string,
  certId: string,
  action: "approve" | "reject",
  medianEstimate: number
) {
  return request<{
    success: boolean;
    approved: boolean;
    healthChange: number;
    winner: string | null;
  }>(`/api/session/${sessionId}/certificates/${certId}/process`, {
    method: "POST",
    body: JSON.stringify({ action, medianEstimate }),
  });
}

// ---------- Auditor ----------

export async function getLedger(sessionId: string) {
  return request<{
    success: boolean;
    entries: LedgerEntry[];
  }>(`/api/session/${sessionId}/ledger`);
}

export async function issueCooldown(
  sessionId: string,
  targetPlayerId: string,
  reason: string
) {
  return request<{ success: boolean; cooldownDuration: number; cooldownUntil: number; abilityCooldownUntil: number }>(
    `/api/session/${sessionId}/cooldown`,
    {
      method: "POST",
      body: JSON.stringify({ targetPlayerId, reason }),
    }
  );
}

// ---------- Types ----------

export interface GameState {
  success: boolean;
  sessionId: string;
  globalHealth: number;
  currentRound: number;
  totalRounds: number;
  status: "waiting" | "active" | "completed";
  winner?: string;
  announcement: string;
  roundEndsAt: number;
  joined: boolean;
  displayName: string;
  playerRole: Role | null;
  playerTrustScore: number;
  cooldownUntil: number;
  nextGameAt: number;
  abilityCooldownUntil: number;
  totalPlayers: number;
  isAdmin: boolean;
}

export interface MinigameProblem {
  type: string;
  problemId: number;
  instruction: string;
  targetValue?: number;
  tolerance?: number;
  minValue?: number;
  maxValue?: number;
  readings?: number[];
  sequence?: number[];
  leftWeight?: number;
  rightWeight?: number;
  baseFrequency?: number;
  harmonic?: number;
}

export interface PendingCertificate {
  id: string;
  problemType: string;
  score: number;
  createdAt: number;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  trustScore: number;
  role: string | null;
  cooldownUntil: number;
}

export interface LedgerEntry {
  certificateId: string;
  playerId: string;
  playerName?: string;
  authorityId: string;
  action: string;
  score: number;
  wasInfected: boolean;
  healthChange: number;
  timestamp: number;
}

// ---------- Admin ----------

export interface AdminOverview {
  success: boolean;
  session: null | {
    id: string; status: "waiting" | "active" | "completed"; currentRound: number; totalRounds: number;
    globalHealth: number; winner: string | null; announcement: string; roundDurationMs: number;
    roundEndsAt: number; createdAt: number;
  };
  roleCounts: Record<string, number>;
  certificates: Record<string, { count: number; avg: number }>;
  players: { id: string; name: string; email: string; role: Role; trust: number; cooldownUntil: number; tasks: number }[];
  events: { id: string; ts: number; kind: string; actor: string | null; target: string | null; detail: string | null }[];
  sessions: { id: string; status: string; winner: string | null; createdAt: number; round: number }[];
}

const post = (path: string, body: unknown = {}) =>
  request<{ success: boolean }>(`/api/admin${path}`, { method: "POST", body: JSON.stringify(body) });

export const admin = {
  overview: () => request<AdminOverview>("/api/admin/overview"),
  newSession: (opts: { totalRounds?: number; roundMinutes?: number } = {}) => post("/session/new", opts),
  start: (force = false) => post("/session/start", { force }),
  nextRound: () => post("/session/next-round"),
  end: (winner: "citizen" | "attacker" | null = null) => post("/session/end", { winner }),
  setHealth: (value: number) => post("/session/health", { value }),
  announce: (message: string) => post("/session/announce", { message }),
  config: (cfg: { totalRounds?: number; roundMinutes?: number }) => post("/session/config", cfg),
  updatePlayer: (id: string, patch: { role?: Role; cooldownSeconds?: number; trustScore?: number }) =>
    post(`/player/${encodeURIComponent(id)}`, patch),
  kick: (id: string) =>
    request<{ success: boolean }>(`/api/admin/player/${encodeURIComponent(id)}`, { method: "DELETE" }),
  async downloadCsv(sessionId: string) {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`${API_BASE}/api/admin/results.csv?session=${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Export failed");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url; a.download = `results-${sessionId}.csv`; a.click();
    URL.revokeObjectURL(url);
  },
};
