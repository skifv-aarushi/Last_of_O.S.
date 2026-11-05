/**
 * Email-code sign-in restricted to @vitstudent.ac.in.
 * A one-time code is emailed to the student, then exchanged on the backend for a session token.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
}

type Listener = (user: User | null) => void;
const listeners = new Set<Listener>();

function readUser(): User | null {
  try {
    const raw = localStorage.getItem("authUser");
    return raw && localStorage.getItem("authToken") ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const auth = { currentUser: readUser() as User | null };

function setUser(user: User | null) {
  auth.currentUser = user;
  listeners.forEach((cb) => cb(user));
}

/** Subscribe to auth changes; fires immediately with the current user. */
export function onAuthStateChanged(_auth: typeof auth, cb: Listener) {
  listeners.add(cb);
  cb(auth.currentUser);
  return () => {
    listeners.delete(cb);
  };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Try again.");
  return json as T;
}

/** Step 1: email a 6-digit code to a @vitstudent.ac.in address. */
export async function requestLoginCode(email: string): Promise<void> {
  await post("/api/auth/request-code", { email });
}

/** Step 2: exchange the emailed code for a session. */
export async function verifyLoginCode(email: string, code: string): Promise<User> {
  const json = await post<{ token: string; user: User }>("/api/auth/verify-code", { email, code });
  localStorage.setItem("authToken", json.token);
  localStorage.setItem("authUser", JSON.stringify(json.user));
  localStorage.setItem("playerName", json.user.displayName ?? "Player");
  setUser(json.user);
  return json.user;
}

/** Sign out and clear stored tokens. */
export async function signOut(): Promise<void> {
  ["authToken", "authUser", "playerName", "sessionId"].forEach((k) => localStorage.removeItem(k));
  setUser(null);
}

/** Refresh the session token (call periodically; tokens expire after 12 h). */
export async function refreshToken(): Promise<string | null> {
  const token = localStorage.getItem("authToken");
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) await signOut();
    return null;
  }
  const { token: fresh } = await res.json();
  localStorage.setItem("authToken", fresh);
  return fresh;
}
