import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { App } from "./App";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

createRoot(document.getElementById("root")!).render(
  publishableKey ? (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/game">
      <App />
    </ClerkProvider>
  ) : (
    <p style={{ padding: 24, fontFamily: "monospace" }}>
      Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to your environment (see DEPLOY.md) and rebuild.
    </p>
  )
);
