import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { auth, onAuthStateChanged } from "@/lib/auth";
import { admin, ApiError, type AdminOverview, type Role } from "@/lib/api";
import { PixelButton, PixelPanel } from "@/components/pixel";

const ROLES: Role[] = ["citizen", "attacker", "authority", "auditor"];
const ROLE_COLOR: Record<string, string> = {
  citizen: "#00e5ff", attacker: "#f97316", authority: "#00ff00", auditor: "#a855f7",
};

const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString();
const fmtLeft = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <PixelPanel className={`p-4 ${className}`}>
      <h2 className="font-pixel text-[10px] sm:text-xs text-pixel-cyan mb-4 uppercase">{title}</h2>
      {children}
    </PixelPanel>
  );
}

function Btn({ children, onClick, tone = "default", disabled }: {
  children: React.ReactNode; onClick: () => void; tone?: "default" | "primary" | "danger"; disabled?: boolean;
}) {
  const accent = tone === "primary" ? "#00e5ff" : tone === "danger" ? "#f87171" : "#d1d5db";
  return (
    <PixelButton accent={accent} disabled={disabled} onClick={onClick} className="!px-3 !py-1.5">
      {children}
    </PixelButton>
  );
}

const INPUT = "bg-black/60 border border-gray-600 px-2 py-1.5 text-sm text-white outline-none focus:border-pixel-cyan font-jura";

export default function Admin() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [denied, setDenied] = useState(false);
  const [, tick] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [rounds, setRounds] = useState("4");
  const [minutes, setMinutes] = useState("5");
  const [healthInput, setHealthInput] = useState("");
  const [filter, setFilter] = useState("");

  const refresh = useCallback(async () => {
    try {
      setData(await admin.overview());
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setDenied(true);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (!u) navigate("/game", { replace: true }); });
    return unsub;
  }, [navigate]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 3000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [refresh]);

  const run = async (label: string, fn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await fn();
      toast.success(label);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    }
  };

  if (denied) {
    return (
      <div className="min-h-screen bg-[#0a0e17] text-gray-200 flex flex-col items-center justify-center gap-4">
        <p>This account is not an admin. Add the email to the ADMIN_EMAILS environment variable.</p>
        <Link to="/lobby" className="text-pixel-cyan underline">Back to the game</Link>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-[#0a0e17] text-gray-400 flex items-center justify-center">Loading...</div>;

  const s = data.session;
  const now = Date.now();
  const players = data.players.filter((p) =>
    !filter || `${p.name} ${p.email} ${p.role}`.toLowerCase().includes(filter.toLowerCase()));
  const pending = data.certificates.pending?.count ?? 0;

  return (
    <div className="relative min-h-screen bg-[#0a0e17] text-gray-100 font-jura p-4 sm:p-6 overflow-hidden">
      <img src="/user-info-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-pixel text-base sm:text-xl text-white">ADMIN <span className="text-pixel-cyan">CONTROL</span></h1>
            <p className="text-sm text-gray-400 mt-2">The Last of O.S - live dashboard (refreshes every 3s)</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/screen" target="_blank" rel="noreferrer"><PixelButton accent="#facc15" className="!px-3 !py-1.5">Big screen</PixelButton></a>
            <Link to="/lobby"><PixelButton accent="#d1d5db" className="!px-3 !py-1.5">Player view</PixelButton></Link>
            <Btn tone="primary" onClick={() => run("New lobby opened", () =>
              admin.newSession({ totalRounds: Number(rounds), roundMinutes: Number(minutes) }),
              s && s.status !== "completed" ? "This closes the current game for everyone. Continue?" : undefined)}>
              New game
            </Btn>
          </div>
        </header>

        {!s ? (
          <Panel title="No game yet">
            <p className="text-sm text-gray-400">Open a lobby with "New game", or just have a player sign in and one is created automatically.</p>
          </Panel>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                ["Status", s.status.toUpperCase()],
                ["Round", `${s.currentRound} / ${s.totalRounds}`],
                ["Round timer", s.roundEndsAt > now ? fmtLeft(s.roundEndsAt - now) : s.roundDurationMs ? "-" : "manual"],
                ["System health", `${Math.round(s.globalHealth)}%`],
                ["Pending certificates", String(pending)],
              ].map(([k, v]) => (
                <PixelPanel key={k} className="p-4">
                  <div className="font-pixel text-[9px] text-gray-400 uppercase">{k}</div>
                  <div className="font-pixel text-base sm:text-lg text-white mt-3">{v}</div>
                </PixelPanel>
              ))}
            </div>

            {s.status === "completed" && (
              <PixelPanel className="p-4 flex flex-wrap items-center justify-between gap-3" accent="#facc15">
                <span>Game over - winner: <b>{s.winner ?? "none"}</b></span>
                <Btn onClick={() => run("Exported", () => admin.downloadCsv(s.id))}>Download results CSV</Btn>
              </PixelPanel>
            )}

            <div className="grid lg:grid-cols-3 gap-4">
              <Panel title="Controls" className="lg:col-span-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Btn tone="primary" disabled={s.status !== "waiting"}
                    onClick={() => run("Game started", () => admin.start(false))}>Start game</Btn>
                  <Btn disabled={s.status !== "waiting"}
                    onClick={() => run("Game started (forced)", () => admin.start(true),
                      "Force start with fewer than 4 players? Role balance will be off.")}>Force start</Btn>
                  <Btn disabled={s.status !== "active"} onClick={() => run("Next round", () => admin.nextRound())}>Next round</Btn>
                  <Btn tone="danger" disabled={s.status === "completed"}
                    onClick={() => run("Game ended", () => admin.end(null), "End the game now with no winner?")}>End game</Btn>
                </div>

                <label className="text-xs text-gray-400">Announcement banner</label>
                <div className="flex gap-2 mb-4 mt-1">
                  <input value={announce} onChange={(e) => setAnnounce(e.target.value)} maxLength={200}
                    placeholder={s.announcement || "Message to all players"}
                    className={`flex-1 ${INPUT}`} />
                  <Btn onClick={() => run("Announced", () => admin.announce(announce).then(() => setAnnounce("")))}>Send</Btn>
                  <Btn onClick={() => run("Cleared", () => admin.announce(""))}>Clear</Btn>
                </div>

                <label className="text-xs text-gray-400">Set system health (0-100)</label>
                <div className="flex gap-2 mb-4 mt-1">
                  <input value={healthInput} onChange={(e) => setHealthInput(e.target.value)} inputMode="numeric"
                    className={`w-24 ${INPUT}`} />
                  <Btn disabled={s.status === "completed" || healthInput === ""}
                    onClick={() => run("Health updated", () => admin.setHealth(Number(healthInput)))}>Apply</Btn>
                </div>

                <label className="text-xs text-gray-400">Rounds / minutes per round (0 = manual)</label>
                <div className="flex gap-2 mt-1">
                  <input value={rounds} onChange={(e) => setRounds(e.target.value)} inputMode="numeric"
                    className={`w-16 ${INPUT}`} />
                  <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="decimal"
                    className={`w-16 ${INPUT}`} />
                  <Btn disabled={s.status === "completed"}
                    onClick={() => run("Config saved", () => admin.config({ totalRounds: Number(rounds), roundMinutes: Number(minutes) }))}>
                    Apply to this game
                  </Btn>
                </div>
              </Panel>

              <Panel title={`Roles (${data.players.length} players)`}>
                <div className="space-y-2">
                  {ROLES.map((r) => {
                    const n = data.roleCounts[r] ?? 0;
                    const pct = data.players.length ? (n / data.players.length) * 100 : 0;
                    return (
                      <div key={r}>
                        <div className="flex justify-between text-sm"><span style={{ color: ROLE_COLOR[r] }}>{r}</span><span>{n}</span></div>
                        <div className="h-2 bg-gray-800"><div className="h-2" style={{ width: `${pct}%`, background: ROLE_COLOR[r] }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-sm text-gray-400 space-y-1">
                  {Object.entries(data.certificates).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span>{k} certificates</span><span>{v.count} (avg {Math.round(v.avg)})</span></div>
                  ))}
                </div>
              </Panel>

              <Panel title="Activity log">
                <ul className="space-y-1 max-h-64 overflow-y-auto text-xs font-mono">
                  {data.events.length === 0 && <li className="text-gray-500">Nothing yet.</li>}
                  {data.events.map((e) => (
                    <li key={e.id} className="text-gray-300">
                      <span className="text-gray-500">{fmtTime(e.ts)}</span> {e.kind}
                      {e.target ? ` -> ${data.players.find((p) => p.id === e.target)?.name ?? e.target}` : ""}
                      {e.detail ? ` (${e.detail})` : ""}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title="Players">
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, email or role"
                className={`mb-3 w-full sm:w-72 ${INPUT}`} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="font-pixel text-[9px] uppercase text-gray-400 text-left">
                    <tr><th className="py-2 pr-3">Name</th><th className="pr-3">Role</th><th className="pr-3">Trust</th>
                      <th className="pr-3">Tasks</th><th className="pr-3">Cooldown</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id} className="border-t border-gray-700">
                        <td className="py-2 pr-3">{p.name}<div className="text-xs text-gray-500">{p.email}</div></td>
                        <td className="pr-3">
                          <select value={p.role} onChange={(e) => run("Role changed", () => admin.updatePlayer(p.id, { role: e.target.value as Role }))}
                            className="bg-black/60 border border-gray-600 px-1 py-1 font-jura" style={{ color: ROLE_COLOR[p.role] }}>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="pr-3">{p.trust}</td>
                        <td className="pr-3">{p.tasks}</td>
                        <td className="pr-3">{p.cooldownUntil > now ? fmtLeft(p.cooldownUntil - now) : "-"}</td>
                        <td className="space-x-1 whitespace-nowrap">
                          {p.cooldownUntil > now
                            ? <Btn onClick={() => run("Cooldown cleared", () => admin.updatePlayer(p.id, { cooldownSeconds: 0 }))}>Clear CD</Btn>
                            : <Btn onClick={() => run("Cooldown applied", () => admin.updatePlayer(p.id, { cooldownSeconds: 120 }))}>CD 2m</Btn>}
                          <Btn tone="danger" onClick={() => run("Player removed", () => admin.kick(p.id), `Remove ${p.name} from the game?`)}>Kick</Btn>
                        </td>
                      </tr>
                    ))}
                    {players.length === 0 && <tr><td colSpan={6} className="py-4 text-gray-500">No players.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Recent games">
              <ul className="text-sm text-gray-300 space-y-1">
                {data.sessions.map((x) => (
                  <li key={x.id} className="flex justify-between gap-3">
                    <span>{new Date(x.createdAt).toLocaleString()} - {x.status}{x.winner ? ` (${x.winner} won)` : ""}</span>
                    <button className="text-pixel-cyan hover:underline" onClick={() => run("Exported", () => admin.downloadCsv(x.id))}>CSV</button>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
