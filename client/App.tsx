import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Game from "./pages/Game";
import Play from "./pages/Play";
import AimTrainer from "./pages/AimTrainer";
import TypingTest from "./pages/TypingTest";
import VisualMemory from "./pages/VisualMemory";
import InventoryManagement from "./pages/InventoryManagement";
import PIDTuning from "./pages/PIDTuning";
import Signup from "./pages/Signup";
import HealthBarDemo from "./pages/HealthBarDemo";
import Authority from "./pages/authority";
import AttackerIndex from "./pages/attacker/Index";
import AttackerGame from "./pages/attacker/Game";
import AttackerPlay from "./pages/attacker/Play";
import AttackerAimTrainer from "./pages/attacker/AimTrainer";
import AttackerTypingTest from "./pages/attacker/TypingTest";
import AttackerVisualMemory from "./pages/attacker/VisualMemory";
import AttackerInventoryManagement from "./pages/attacker/InventoryManagement";
import AttackerPIDTuning from "./pages/attacker/PIDTuning";
import AttackerSignup from "./pages/attacker/Signup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/game" element={<Game />} />
          <Route path="/play" element={<Play />} />
          <Route path="/aim-trainer" element={<AimTrainer />} />
          <Route path="/typing-test" element={<TypingTest />} />
          <Route path="/visual-memory" element={<VisualMemory />} />
          <Route path="/inventory-management" element={<InventoryManagement />} />
          <Route path="/pid-tuning" element={<PIDTuning />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/health-demo" element={<HealthBarDemo />} />
          <Route path="/authority" element={<Authority />} />
          <Route path="/attacker" element={<AttackerIndex />} />
          <Route path="/attacker/game" element={<AttackerGame />} />
          <Route path="/attacker/play" element={<AttackerPlay />} />
          <Route path="/attacker/aim-trainer" element={<AttackerAimTrainer />} />
          <Route path="/attacker/typing-test" element={<AttackerTypingTest />} />
          <Route path="/attacker/visual-memory" element={<AttackerVisualMemory />} />
          <Route path="/attacker/inventory-management" element={<AttackerInventoryManagement />} />
          <Route path="/attacker/pid-tuning" element={<AttackerPIDTuning />} />
          <Route path="/attacker/signup" element={<AttackerSignup />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
