import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black via-[#1a0505] to-[#2d0a0a]" />
      <div className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #f97316 2px, #f97316 4px)' }} />

      <div className="relative z-10 text-center px-4">
        <h1 className="text-8xl sm:text-9xl font-jura text-[#f97316] mb-4 animate-pulse">404</h1>
        <p className="text-xl sm:text-2xl font-jura text-pixel-cream mb-8 uppercase tracking-widest">
          Sectore Not Found / Access Denied
        </p>
        <a
          href="/attacker"
          className="inline-block px-8 py-3 border-2 border-[#f97316] text-[#f97316] font-jura text-sm hover:bg-[#f97316]/20 transition-all active:scale-95 uppercase"
        >
          Return to Hub
        </a>
      </div>
    </div>
  );
};

export default NotFound;
