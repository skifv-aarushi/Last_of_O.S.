import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HealthBar from "@/components/HealthBar";
import { PixelPanel, ROLE_STYLE } from "@/components/pixel";
import { admin, ApiError, type AdminOverview, type Role } from "@/lib/api";

const fmtLeft = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Big-screen view for projecting during an event. Never shows anyone's role while the game is live.
 */
export default function AdminScreen() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [denied, setDenied] = useState(false);
  const [, tick] = useState(0);

  const refresh = useCallback(async () => {
    try { setData(await admin.overview()); }
    catch (e) { if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setDenied(true); }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 3000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [refresh]);

  const joinUrl = `${window.location.host}/game`;

  if (denied) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center gap-4 font-pixel text-xs text-gray-300">
        <p>ADMIN SIGN-IN REQUIRED</p>
        <Link to="/game" className="text-pixel-cyan underline">SIGN IN</Link>
      </div>
    );
  }

  const s = data?.session;
  const now = Date.now();
  const top = (data?.players ?? []).slice(0, 10);

  return (
    <div className="relative min-h-screen w-full bg-[#0a0e17] overflow-hidden">
      <img src="/lab-scene.png" alt="" className="absolute inset-0 h-full w-full object-fill pixelated opacity-25" />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 min-h-screen flex flex-col px-6 sm:px-12 py-8 gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-tiny text-5xl sm:text-7xl text-pixel-cream leading-none">THE LAST OF O.S</h1>
          <div className="text-right">
            <p className="font-pixel text-[10px] sm:text-xs text-gray-400 mb-2">JOIN AT</p>
            <p className="font-pixel text-sm sm:text-xl text-pixel-cyan">{joinUrl}</p>
          </div>
        </header>

        {s?.announcement && (
          <div className="bg-yellow-400/90 text-black font-pixel text-sm sm:text-lg text-center px-4 py-3">{s.announcement}</div>
        )}

        {!s ? (
          <Centered title="WAITING FOR A GAME" sub="Sign in to join the next one." />
        ) : s.status === "waiting" ? (
          <div className="flex-1 flex flex-col gap-6">
            <div className="text-center">
              <p className="font-pixel text-lg sm:text-2xl text-white">LOBBY OPEN</p>
              <p className="font-pixel text-5xl sm:text-7xl text-pixel-cyan mt-6">{data!.players.length}</p>
              <p className="font-pixel text-xs sm:text-sm text-gray-400 mt-3">OPERATORS READY</p>
            </div>
            <PixelPanel className="p-6 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {data!.players.map((p) => (
                  <div key={p.id} className="font-jura text-base sm:text-lg text-white bg-white/5 border-l-2 border-pixel-cyan px-3 py-1 truncate">{p.name}</div>
                ))}
              </div>
            </PixelPanel>
          </div>
        ) : s.status === "active" ? (
          <div className="flex-1 flex flex-col gap-8">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat label="ROUND" value={`${s.currentRound}/${s.totalRounds}`} />
              <Stat label="TIME LEFT" value={s.roundEndsAt > now ? fmtLeft(s.roundEndsAt - now) : "--"} />
              <Stat label="OPERATORS" value={String(data!.players.length)} />
            </div>
            <div className="h-16 sm:h-20">
              <HealthBar value={s.globalHealth} total={100} label={`SYSTEM HEALTH ${Math.round(s.globalHealth)}%`} className="h-full" />
            </div>
            <div className="grid lg:grid-cols-2 gap-6 flex-1">
              <PixelPanel className="p-6">
                <p className="font-pixel text-sm text-white mb-4">MOST <span className="text-pixel-cyan">TRUSTED</span></p>
                <ol className="space-y-2">
                  {top.map((p, i) => (
                    <li key={p.id} className="flex justify-between font-jura text-lg text-white bg-white/5 px-3 py-1">
                      <span className="truncate">{i + 1}. {p.name}</span>
                      <span className="text-pixel-cyan ml-3">{p.trust}</span>
                    </li>
                  ))}
                </ol>
              </PixelPanel>
              <PixelPanel className="p-6">
                <p className="font-pixel text-sm text-white mb-4">CERTIFICATE <span className="text-pixel-cyan">FLOW</span></p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {(["pending", "approved", "rejected"] as const).map((k) => (
                    <div key={k}>
                      <p className="font-pixel text-3xl sm:text-4xl text-white">{data!.certificates[k]?.count ?? 0}</p>
                      <p className="font-pixel text-[10px] text-gray-400 mt-2">{k.toUpperCase()}</p>
                    </div>
                  ))}
                </div>
              </PixelPanel>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center gap-6">
            <p
              className="font-pixel text-2xl sm:text-5xl text-center leading-relaxed"
              style={{ color: s.winner === "attacker" ? ROLE_STYLE.attacker.color : ROLE_STYLE.citizen.color }}
            >
              {s.winner === "attacker" ? "THE SYSTEM HAS FALLEN" : s.winner === "citizen" ? "THE SYSTEM SURVIVED" : "GAME OVER"}
            </p>
            <p className="font-pixel text-sm text-white">
              {s.winner ? `${s.winner.toUpperCase()}S WIN` : "NO WINNER"} - FINAL HEALTH {Math.round(s.globalHealth)}%
            </p>
            <PixelPanel className="p-6 w-full max-w-3xl">
              <ol className="space-y-2">
                {top.map((p, i) => (
                  <li key={p.id} className="flex justify-between font-jura text-lg text-white bg-white/5 px-3 py-1 border-l-2" style={{ borderColor: ROLE_STYLE[p.role as Role]?.color }}>
                    <span className="truncate">{i + 1}. {p.name}</span>
                    <span className="ml-3">
                      <span className="font-pixel text-[10px]" style={{ color: ROLE_STYLE[p.role as Role]?.color }}>{p.role.toUpperCase()}</span>
                      <span className="text-gray-300"> {p.trust}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </PixelPanel>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <PixelPanel className="py-5">
      <p className="font-pixel text-[10px] sm:text-xs text-gray-400">{label}</p>
      <p className="font-pixel text-2xl sm:text-4xl text-white mt-3">{value}</p>
    </PixelPanel>
  );
}

function Centered({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
      <p className="font-pixel text-xl sm:text-3xl text-white">{title}</p>
      <p className="font-jura text-lg text-gray-300">{sub}</p>
    </div>
  );
}
