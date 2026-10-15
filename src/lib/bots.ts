import { ECHO_PHONE, GUIDE_PHONE } from "@/db/seed";
import { formatPhone } from "@/lib/phone";

const GUIDE_TIPS = [
  "Welcome to NEXA. Your number is your identity — share it, message it, call it. Dial any number starting with +12, +67 or +30.",
  "Pro tip: open the Dial tab, tap a prefix chip, then punch in 7 digits. If the number is live on the network you can call it instantly.",
  "Every NEXA account ships with a developer API key — find it under Settings → Developer API. Send messages and place calls from your own code.",
  "NEXA supports voice AND video calls, peer-to-peer over WebRTC. Green dot means the line is live.",
  "Head to nexa.dev/developers (the Developers link up top) for Python, cURL and JavaScript examples.",
  "Unread messages show double ticks once read. Presence updates in real time — the network never sleeps.",
];

export function botReply(botPhone: string, fromName: string, body: string): string | null {
  if (botPhone === ECHO_PHONE) {
    return `Echoing across the grid: “${body.slice(0, 140)}” — loud and clear, ${fromName}.`;
  }
  if (botPhone === GUIDE_PHONE) {
    const normalized = body.toLowerCase();
    if (normalized.includes("call")) {
      return "To call someone, open the Dial tab, enter their full number (prefix + 7 digits) and hit the phone or camera icon. If they're online, their device rings instantly.";
    }
    if (normalized.includes("api") || normalized.includes("key")) {
      return "Your developer API key lives in Settings → Developer API. Use it as `Authorization: Bearer <key>` on /api/v1/* endpoints to send messages and place calls from Python, curl, anywhere.";
    }
    if (normalized.includes("admin")) {
      return `The network operator can be reached at ${formatPhone("+120000001")}. Operators manage numbers from the Admin console.`;
    }
    const hash = [...body].reduce((a, c) => a + c.charCodeAt(0), 0);
    return GUIDE_TIPS[hash % GUIDE_TIPS.length];
  }
  return null;
}
