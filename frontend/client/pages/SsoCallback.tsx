import { AuthenticateWithRedirectCallback } from "@clerk/react";

/** Google sends the player back here; Clerk finishes the sign-in (or sign-up) and returns to /game. */
export default function SsoCallback() {
  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center">
      <span className="font-pixel text-sm text-pixel-cyan animate-pulse">SIGNING YOU IN...</span>
      <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/game" signUpFallbackRedirectUrl="/game" />
    </div>
  );
}
