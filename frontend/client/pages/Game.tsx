import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { useSignIn } from "@clerk/react/legacy";
import { exchangeClerkToken, auth, onAuthStateChanged, signOut } from "@/lib/auth";
import { joinLobby } from "@/lib/api";
import { PixelButton, PixelPanel } from "@/components/pixel";

export default function Game() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: signInReady, signIn } = useSignIn();
  const [redirecting, setRedirecting] = useState(false);

  // Google is the only way in; Clerk sends the player to Google and back to /sso-callback
  const signInWithGoogle = async () => {
    if (!signIn) return;
    setError(null);
    setRedirecting(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/game",
      });
    } catch (err: any) {
      setRedirecting(false);
      setError(err?.errors?.[0]?.longMessage ?? err?.message ?? "Could not reach Google. Try again.");
    }
  };
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const exchanging = useRef(false);

  // Already has a game session -> straight to the lobby, which routes by game status and role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !exchanging.current) navigate("/lobby", { replace: true });
      setAuthChecking(false);
    });
    return unsub;
  }, [navigate]);

  // Clerk finished signing the student in -> swap its token for a game session and join the game
  useEffect(() => {
    if (!isLoaded || !isSignedIn || auth.currentUser || exchanging.current) return;
    exchanging.current = true;
    setWorking(true);
    setError(null);
    (async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error("Could not get a sign-in token. Try again.");
        await exchangeClerkToken(clerkToken);
        // Everyone shares one open game; join it (or start a fresh lobby if none exists)
        const { sessionId } = await joinLobby();
        localStorage.setItem("sessionId", sessionId);
        navigate("/lobby", { replace: true });
      } catch (err: any) {
        setError(err.message ?? "Login failed. Try again.");
        await signOut(); // ends the Clerk session too, so a wrong (non-VIT) account can retry
      } finally {
        exchanging.current = false;
        setWorking(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken, navigate]);

  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center">
        <span className="font-pixel text-sm text-pixel-cyan animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center overflow-auto relative">
      {/* Background image - pixel art cityscape */}
      <img
        src="https://api.builder.io/api/v1/image/assets/TEMP/37dd726e68a0725cf6d40157a803bb41645d6400?width=2880"
        alt="Cyberpunk pixel art cityscape"
        className="absolute inset-0 w-full h-full object-cover pixelated"
      />

      <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="font-tiny text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-pixel-cream text-center leading-tight mb-8 sm:mb-12">
          THE LAST
          <br />
          OF O.S
        </h1>

        <PixelPanel className="w-full max-w-md p-6 sm:p-8">
          <h2 className="font-pixel text-base sm:text-lg md:text-xl text-white text-center mb-2">
            PLAYER
            <br />
            LOGIN
          </h2>
          <p className="font-jura text-xs sm:text-sm text-gray-300 text-center mb-6">
            Sign in with your VIT Google account (<span className="text-pixel-cyan">@vitstudent.ac.in</span>).
          </p>

          {error && (
            <p className="mb-4 font-jura text-xs sm:text-sm text-red-300 text-center border border-red-400/50 bg-red-950/40 px-3 py-2">
              {error}
            </p>
          )}

          {working || (isLoaded && isSignedIn) ? (
            <p className="font-pixel text-xs text-pixel-cyan text-center animate-pulse py-6">ENTERING THE O.S...</p>
          ) : (
            <button
              onClick={signInWithGoogle}
              disabled={!signInReady || redirecting}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black/50 border-2 border-pixel-cyan text-pixel-cyan font-pixel text-[10px] sm:text-xs uppercase hover:bg-pixel-cyan/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg aria-hidden="true" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              {redirecting ? "OPENING GOOGLE..." : "SIGN IN WITH GOOGLE"}
            </button>
          )}
        </PixelPanel>

        <PixelButton onClick={() => navigate("/")} className="mt-8 sm:mt-10 tracking-wider">
          BACK
        </PixelButton>
      </div>
    </div>
  );
}
