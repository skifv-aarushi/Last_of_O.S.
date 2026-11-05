/**
 * Google sign-in restricted to @vitstudent.ac.in.
 * The Google access token is exchanged on the backend for a short-lived session token.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const ALLOWED_DOMAIN = "vitstudent.ac.in";

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

function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error("Google sign-in failed to load. Check your connection and retry."));
      return;
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      hd: ALLOWED_DOMAIN,
      callback: (resp: any) =>
        resp.error ? reject(new Error(resp.error_description ?? resp.error)) : resolve(resp.access_token),
      error_callback: (err: any) => reject(new Error(err?.message ?? "Sign-in was cancelled.")),
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}

/** Sign in with Google popup. Only allows @vitstudent.ac.in emails. */
export async function signInWithGoogle(): Promise<User> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Sign-in failed");

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
