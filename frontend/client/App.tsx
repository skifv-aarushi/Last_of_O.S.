import "./global.css";

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";

// Every other screen is loaded on demand, so phones only download the screens they actually open
const Game = lazy(() => import("./pages/Game"));
const SsoCallback = lazy(() => import("./pages/SsoCallback"));
const Lobby = lazy(() => import("./pages/Lobby"));
const Results = lazy(() => import("./pages/Results"));
const HowToPlay = lazy(() => import("./pages/HowToPlay"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminScreen = lazy(() => import("./pages/AdminScreen"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Play = lazy(() => import("./pages/Play"));
const AimTrainer = lazy(() => import("./pages/AimTrainer"));
const TypingTest = lazy(() => import("./pages/TypingTest"));
const VisualMemory = lazy(() => import("./pages/VisualMemory"));
const InventoryManagement = lazy(() => import("./pages/InventoryManagement"));
const PIDTuning = lazy(() => import("./pages/PIDTuning"));
const UserInfo = lazy(() => import("./pages/UserInfo"));
const PersonalStats = lazy(() => import("./pages/PersonalStats"));

const AuthorityGame = lazy(() => import("./pages/authority/Game"));
const AuthorityPlay = lazy(() => import("./pages/authority/Play"));
const AuthorityUserInfo = lazy(() => import("./pages/authority/UserInfo"));
const AuthorityPersonalStats = lazy(() => import("./pages/authority/PersonalStats"));

const AuditorGame = lazy(() => import("./pages/auditor/Game"));
const AuditorPlay = lazy(() => import("./pages/auditor/Play"));
const AuditorUserInfo = lazy(() => import("./pages/auditor/UserInfo"));

const AttackerPlay = lazy(() => import("./pages/attacker/Play"));
const AttackerAimTrainer = lazy(() => import("./pages/attacker/AimTrainer"));
const AttackerTypingTest = lazy(() => import("./pages/attacker/TypingTest"));
const AttackerVisualMemory = lazy(() => import("./pages/attacker/VisualMemory"));
const AttackerInventoryManagement = lazy(() => import("./pages/attacker/InventoryManagement"));
const AttackerPIDTuning = lazy(() => import("./pages/attacker/PIDTuning"));
const AttackerUserInfo = lazy(() => import("./pages/attacker/UserInfo"));
const AttackerPersonalStats = lazy(() => import("./pages/attacker/PersonalStats"));

const queryClient = new QueryClient();

function Loading() {
  return (
    <div className="min-h-screen w-full bg-[#0a0e17] flex items-center justify-center">
      <span className="font-pixel text-sm text-pixel-cyan animate-pulse">LOADING...</span>
    </div>
  );
}

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/game" element={<Game />} />
            <Route path="/sso-callback" element={<SsoCallback />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/results" element={<Results />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/screen" element={<AdminScreen />} />
            <Route path="/play" element={<Play />} />
            <Route path="/aim-trainer" element={<AimTrainer />} />
            <Route path="/typing-test" element={<TypingTest />} />
            <Route path="/visual-memory" element={<VisualMemory />} />
            <Route path="/inventory-management" element={<InventoryManagement />} />
            <Route path="/pid-tuning" element={<PIDTuning />} />
            <Route path="/user-info" element={<UserInfo />} />
            <Route path="/personal-stats" element={<PersonalStats />} />
            <Route path="/signup" element={<Navigate to="/game" replace />} />
            <Route path="/authority/play" element={<AuthorityPlay />} />
            <Route path="/authority/game" element={<AuthorityGame />} />
            <Route path="/authority/user-info" element={<AuthorityUserInfo />} />
            <Route path="/authority/personal-stats" element={<AuthorityPersonalStats />} />
            <Route path="/auditor/play" element={<AuditorPlay />} />
            <Route path="/auditor/game" element={<AuditorGame />} />
            <Route path="/auditor/user-info" element={<AuditorUserInfo />} />
            <Route path="/attacker" element={<Navigate to="/game" replace />} />
            <Route path="/attacker/play" element={<AttackerPlay />} />
            <Route path="/attacker/aim-trainer" element={<AttackerAimTrainer />} />
            <Route path="/attacker/typing-test" element={<AttackerTypingTest />} />
            <Route path="/attacker/visual-memory" element={<AttackerVisualMemory />} />
            <Route path="/attacker/inventory-management" element={<AttackerInventoryManagement />} />
            <Route path="/attacker/pid-tuning" element={<AttackerPIDTuning />} />
            <Route path="/attacker/user-info" element={<AttackerUserInfo />} />
            <Route path="/attacker/personal-stats" element={<AttackerPersonalStats />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
