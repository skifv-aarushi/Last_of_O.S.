import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged, type User } from "@/lib/firebase";

export default function UserInfo() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) navigate("/game");
    });
    return unsub;
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center">
        <span className="font-pixel text-sm text-pixel-cyan animate-pulse">LOADING...</span>
      </div>
    );
  }

  const playerName = user?.displayName ?? localStorage.getItem("playerName") ?? "UNKNOWN";
  const email = user?.email ?? "—";
  const photoURL = user?.photoURL;
  const uid = user?.uid ?? "—";

  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-black/60 border-2 border-pixel-cyan p-6 sm:p-8">
        {/* Header */}
        <h1 className="font-pixel text-lg sm:text-xl text-pixel-cyan text-center mb-6">
          USER INFO
        </h1>

        {/* Avatar */}
        {photoURL && (
          <div className="flex justify-center mb-6">
            <img
              src={photoURL}
              alt="Player avatar"
              className="w-20 h-20 border-2 border-pixel-cyan pixelated"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Info rows */}
        <div className="space-y-4">
          <Row label="NAME" value={playerName} />
          <Row label="EMAIL" value={email} />
          <Row label="UID" value={uid.slice(0, 16) + "..."} />
          <Row label="SESSION" value={localStorage.getItem("sessionId") ?? "NONE"} />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate("/play")}
          className="mt-8 w-full py-2 bg-transparent border-2 border-pixel-cyan text-pixel-cyan font-pixel text-xs sm:text-sm hover:bg-pixel-cyan/20 transition-colors uppercase"
        >
          BACK TO MAP
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-pixel-cyan/20 pb-3">
      <span className="font-pixel text-[10px] text-gray-400">{label}</span>
      <span className="font-pixel text-xs sm:text-sm text-pixel-cream break-all">{value}</span>
    </div>
  );
}
