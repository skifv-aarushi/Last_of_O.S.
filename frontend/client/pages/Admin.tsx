import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { auth, onAuthStateChanged } from "@/lib/auth";
import { admin, ApiError, type AdminOverview, type Role } from "@/lib/api";

const ROLES: Role[] = ["citizen", "attacker", "authority", "auditor"];
const ROLE_COLOR: Record<string, string> = {
  citizen: "#6ec4e5", attacker: "#f97316", authority: "#22c55e", auditor: "#a855f7",
};

const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString();
const fmtLeft = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${className}`}>
      <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Btn({ children, onClick, tone = "default", disabled }: {
  children: React.ReactNode; onClick: () => void; tone?: "default" | "primary" | "danger"; disabled?: boolean;
}) {
  const tones = {
    default: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100",
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white",
    danger: "bg-red-700 hover:bg-red-600 text-white",
  };
  return (
    <button disabled={disabled} onClick={onClick}
      className={`px-3 py-1.5 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}>
      {children}
    </button>
  );
}

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
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center gap-4">
        <p>This account is not an admin. Add the email to the ADMIN_EMAILS environment variable.</p>
        <Link to="/lobby" className="text-cyan-400 underline">Back to the game</Link>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">Loading...</div>;

  const s = data.session;
  const now = Date.now();
  const players = data.players.filter((p) =>
    !filter || `${p.name} ${p.email} ${p.role}`.toLowerCase().includes(filter.toLowerCase()));
  const pending = data.certificates.pending?.count ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Game control</h1>
            <p className="text-sm text-zinc-400">The Last of O.S - live admin dashboard (refreshes every 3s)</p>
          </div>
          <div className="flex gap-2">
            <Link to="/lobby" className="px-3 py-1.5 rounded text-sm bg-zinc-800 hover:bg-zinc-700">Player view</Link>
            <Btn tone="primary" onClick={() => run("New lobby opened", () =>
              admin.newSession({ totalRounds: Number(rounds), roundMinutes: Number(minutes) }),
              s && s.status !== "completed" ? "This closes the current game for everyone. Continue?" : undefined)}>
              New game
            </Btn>
          </div>
        </header>

        {!s ? (
          <Panel title="No game yet">
            <p className="text-sm text-zinc-400">Open a lobby with "New game", or just have a player sign in and one is created automatically.</p>
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
                <div key={k} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs uppercase tracking-widest text-zinc-500">{k}</div>
                  <div className="text-2xl font-semibold mt-1">{v}</div>
                </div>
              ))}
            </div>

            {s.status === "completed" && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                <span>Game over - winner: <b>{s.winner ?? "none"}</b></span>
                <Btn onClick={() => run("Exported", () => admin.downloadCsv(s.id))}>Download results CSV</Btn>
              </div>
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

                <label className="text-xs text-zinc-400">Announcement banner</label>
                <div className="flex gap-2 mb-4 mt-1">
                  <input value={announce} onChange={(e) => setAnnounce(e.target.value)} maxLength={200}
                    placeholder={s.announcement || "Message to all players"}
                    className="flex-1 bg-zinc-800 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-cyan-500" />
                  <Btn onClick={() => run("Announced", () => admin.announce(announce).then(() => setAnnounce("")))}>Send</Btn>
                  <Btn onClick={() => run("Cleared", () => admin.announce(""))}>Clear</Btn>
                </div>

                <label className="text-xs text-zinc-400">Set system health (0-100)</label>
                <div className="flex gap-2 mb-4 mt-1">
                  <input value={healthInput} onChange={(e) => setHealthInput(e.target.value)} inputMode="numeric"
                    className="w-24 bg-zinc-800 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-cyan-500" />
                  <Btn disabled={s.status === "completed" || healthInput === ""}
                    onClick={() => run("Health updated", () => admin.setHealth(Number(healthInput)))}>Apply</Btn>
                </div>

                <label className="text-xs text-zinc-400">Rounds / minutes per round (0 = manual)</label>
                <div className="flex gap-2 mt-1">
                  <input value={rounds} onChange={(e) => setRounds(e.target.value)} inputMode="numeric"
                    className="w-16 bg-zinc-800 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-cyan-500" />
                  <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="decimal"
                    className="w-16 bg-zinc-800 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-cyan-500" />
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
                        <div className="h-2 bg-zinc-800 rounded"><div className="h-2 rounded" style={{ width: `${pct}%`, background: ROLE_COLOR[r] }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-sm text-zinc-400 space-y-1">
                  {Object.entries(data.certificates).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span>{k} certificates</span><span>{v.count} (avg {Math.round(v.avg)})</span></div>
                  ))}
                </div>
              </Panel>

              <Panel title="Activity log">
                <ul className="space-y-1 max-h-64 overflow-y-auto text-xs font-mono">
                  {data.events.length === 0 && <li className="text-zinc-500">Nothing yet.</li>}
                  {data.events.map((e) => (
                    <li key={e.id} className="text-zinc-300">
                      <span className="text-zinc-500">{fmtTime(e.ts)}</span> {e.kind}
                      {e.target ? ` -> ${data.players.find((p) => p.id === e.target)?.name ?? e.target}` : ""}
                      {e.detail ? ` (${e.detail})` : ""}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title="Players">
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, email or role"
                className="mb-3 w-full sm:w-72 bg-zinc-800 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-cyan-500" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-zinc-500 text-left">
                    <tr><th className="py-2 pr-3">Name</th><th className="pr-3">Role</th><th className="pr-3">Trust</th>
                      <th className="pr-3">Tasks</th><th className="pr-3">Cooldown</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id} className="border-t border-zinc-800">
                        <td className="py-2 pr-3">{p.name}<div className="text-xs text-zinc-500">{p.email}</div></td>
                        <td className="pr-3">
                          <select value={p.role} onChange={(e) => run("Role changed", () => admin.updatePlayer(p.id, { role: e.target.value as Role }))}
                            className="bg-zinc-800 rounded px-1 py-1" style={{ color: ROLE_COLOR[p.role] }}>
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
                    {players.length === 0 && <tr><td colSpan={6} className="py-4 text-zinc-500">No players.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Recent games">
              <ul className="text-sm text-zinc-300 space-y-1">
                {data.sessions.map((x) => (
                  <li key={x.id} className="flex justify-between gap-3">
                    <span>{new Date(x.createdAt).toLocaleString()} - {x.status}{x.winner ? ` (${x.winner} won)` : ""}</span>
                    <button className="text-cyan-400 hover:underline" onClick={() => run("Exported", () => admin.downloadCsv(x.id))}>CSV</button>
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
