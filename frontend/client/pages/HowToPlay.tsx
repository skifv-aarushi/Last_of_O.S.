import { useNavigate } from "react-router-dom";
import { PixelButton, PixelHeading, PixelPanel, ROLE_STYLE } from "@/components/pixel";
import type { Role } from "@/lib/api";

const ROLES: { role: Role; goal: string; how: string[] }[] = [
  {
    role: "citizen",
    goal: "Keep the system alive until the last round ends.",
    how: [
      "Walk onto the Task Bay in the middle of your map to get a random task.",
      "Your score becomes a certificate the Authority must judge.",
      "A short buffer (5-15s) follows each task, then you can go again.",
    ],
  },
  {
    role: "attacker",
    goal: "Drain system health to 0 before the rounds run out.",
    how: [
      "Play the same tasks as Citizens, so you blend in.",
      "After each task, choose an infection: none, minor or major.",
      "Infected certificates score slightly lower (-6 / -10), but every one the Authority approves hurts the system.",
    ],
  },
  {
    role: "authority",
    goal: "Approve honest work, reject infected work.",
    how: [
      "Walk onto the Task Bay to open the Sigil Warehouse.",
      "You only see the task and its score. Judge carefully.",
      "The Auditor can put you on a 3-minute cooldown if you look corrupt.",
    ],
  },
  {
    role: "auditor",
    goal: "Expose bad judgement and keep the Authority honest.",
    how: [
      "Walk onto the Task Bay to open the records: every player, role and decision.",
      "You can see which approved certificates were infected.",
      "Put a suspicious Authority on cooldown. Your ability then recharges for 6 minutes.",
    ],
  },
];

const RULES: [string, string, string][] = [
  ["Approve an honest certificate", "+score/10 health", "+5 trust"],
  ["Approve an infected certificate", "-score/5 health", "+3 trust"],
  ["Reject an honest certificate", "-5 health", "-3 trust"],
  ["Reject an infected certificate", "+5 health", "-5 trust"],
];

export default function HowToPlay() {
  const navigate = useNavigate();
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));

  return (
    <div className="relative min-h-screen w-full bg-[#0a0e17] overflow-x-hidden">
      <img src="/lab-scene.png" alt="" className="fixed inset-0 h-full w-full object-fill pixelated opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="text-center space-y-3">
          <h1 className="font-pixel text-xl sm:text-3xl text-white">
            HOW TO <span className="text-pixel-cyan">PLAY</span>
          </h1>
          <p className="font-jura text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            The O.S. is failing. Citizens keep it running, Attackers sabotage it from inside,
            the Authority decides whose work counts, and the Auditor watches the Authority.
          </p>
        </div>

        <PixelPanel className="p-5 sm:p-6">
          <PixelHeading white="THE" accent="FLOW" className="mb-4 !text-sm" />
          <ol className="font-jura text-sm sm:text-base text-gray-200 space-y-2 list-decimal list-inside">
            <li>Sign in with your VIT Google account (<span className="text-pixel-cyan">@vitstudent.ac.in</span>) and wait in the lobby.</li>
            <li>An admin starts the game. Your secret class appears, then you land on your map.</li>
            <li>The game runs in rounds (usually 4 x 5 minutes). The timer is at the top of your screen.</li>
            <li>Walk into the terminals: <span className="text-white">Task Bay</span> (centre) for your job,
              <span className="text-white"> User Info</span> (left) and <span className="text-white">Personal Stats</span> (right) for your record.</li>
            <li>When the game ends everyone sees the final standings and every role is revealed.</li>
          </ol>
        </PixelPanel>

        <div className="grid sm:grid-cols-2 gap-4">
          {ROLES.map(({ role, goal, how }) => {
            const st = ROLE_STYLE[role];
            return (
              <PixelPanel key={role} accent={st.color} className="p-5 flex gap-4">
                <img src={st.sprite} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain pixelated shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-pixel text-sm mb-2" style={{ color: st.color }}>{role.toUpperCase()}</h3>
                  <p className="font-jura text-sm text-white mb-2">{goal}</p>
                  <ul className="font-jura text-xs sm:text-sm text-gray-300 space-y-1 list-disc list-inside">
                    {how.map((h) => <li key={h}>{h}</li>)}
                  </ul>
                </div>
              </PixelPanel>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <PixelPanel className="p-5 sm:p-6">
            <PixelHeading white="AUTHORITY" accent="DECISIONS" className="mb-4 !text-sm" />
            <table className="w-full font-jura text-xs sm:text-sm">
              <tbody>
                {RULES.map(([what, health, trust]) => (
                  <tr key={what} className="border-t border-gray-700">
                    <td className="py-2 pr-2 text-gray-200">{what}</td>
                    <td className={`py-2 pr-2 whitespace-nowrap ${health.startsWith("+") ? "text-pixel-cyan" : "text-red-300"}`}>{health}</td>
                    <td className="py-2 whitespace-nowrap text-gray-400">{trust}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-jura text-xs text-gray-400 mt-3">Trust goes to the player who made the certificate. Highest trust tops the final standings.</p>
          </PixelPanel>

          <PixelPanel className="p-5 sm:p-6">
            <PixelHeading white="WINNING &" accent="CONTROLS" className="mb-4 !text-sm" />
            <ul className="font-jura text-sm text-gray-200 space-y-2">
              <li><span style={{ color: ROLE_STYLE.attacker.color }}>Attackers win</span> the moment system health reaches 0.</li>
              <li><span style={{ color: ROLE_STYLE.citizen.color }}>Everyone else wins</span> if the system survives the last round.</li>
              <li className="pt-2 text-gray-300">Move with <span className="text-white">W A S D</span> or the <span className="text-white">arrow keys</span>. On a phone, use the on-screen pad.</li>
              <li className="text-gray-300">Walk into a terminal to use it. The <span className="text-white">?</span> button on every map brings you back here.</li>
              <li className="text-gray-300">Keep the tab open: your game continues if you refresh or reconnect.</li>
            </ul>
          </PixelPanel>
        </div>

        <div className="flex justify-center pb-4">
          <PixelButton onClick={back}>BACK</PixelButton>
        </div>
      </div>
    </div>
  );
}
