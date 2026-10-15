"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  Copy,
  KeyRound,
  Phone,
  SendHorizontal,
  ShieldAlert,
  Terminal,
  User,
} from "lucide-react";

function CodeBlock({ title, lang, code }: { title: string; lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#070a11]">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <Terminal size={12} className="text-acid" />
        <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{title}</span>
        <span className="ml-auto font-mono text-[10px] text-zinc-700">{lang}</span>
        <button onClick={() => void copy()} className="text-zinc-500 transition-colors hover:text-white" title="Copy">
          {copied ? <Check size={13} className="text-acid" /> : <Copy size={13} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-6 text-zinc-300">{code}</pre>
    </div>
  );
}

const ENDPOINTS: { method: string; path: string; desc: string; accent: string }[] = [
  { method: "GET", path: "/api/v1/me", desc: "Your number, username and account creation date.", accent: "text-cyanx" },
  { method: "POST", path: "/api/v1/messages", desc: 'Send a message from your number. Body: { "to": "+12XXXXXXX", "body": "…" }', accent: "text-acid" },
  { method: "GET", path: "/api/v1/messages?peer=<number>&limit=50", desc: "Read a conversation with any number, newest-last.", accent: "text-cyanx" },
  { method: "POST", path: "/api/v1/calls", desc: 'Place a call — rings the recipient\'s NEXA app. Body: { "to": "+67XXXXXXX", "type": "audio" }', accent: "text-acid" },
  { method: "GET", path: "/api/v1/calls", desc: "Your call history with statuses and durations.", accent: "text-cyanx" },
  { method: "GET", path: "/api/v1/calls/:id", desc: "Live status of one call: ringing → ongoing → ended / missed / declined.", accent: "text-cyanx" },
  { method: "POST", path: "/api/v1/calls/:id", desc: 'Hang up: { "action": "hangup" }', accent: "text-violetx" },
];

export default function DevelopersPage() {
  const [origin, setOrigin] = useState("https://your-nexa.host");
  useEffect(() => setOrigin(window.location.origin), []);

  const curl = `# who am i?
curl ${origin}/api/v1/me \\
  -H "Authorization: Bearer nxk_YOUR_KEY"

# send a message
curl -X POST ${origin}/api/v1/messages \\
  -H "Authorization: Bearer nxk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+675550142", "body": "hello from curl"}'

# place a call — the recipient's app starts ringing
curl -X POST ${origin}/api/v1/calls \\
  -H "Authorization: Bearer nxk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+300000000", "type": "audio"}'`;

  const python = `import requests

API  = "${origin}/api/v1"
KEY  = "nxk_YOUR_KEY"
HEAD = {"Authorization": f"Bearer {KEY}"}

# 1. verify identity
me = requests.get(f"{API}/me", headers=HEAD).json()
print("calling from", me["formatted"])

# 2. send a message
r = requests.post(f"{API}/messages", headers=HEAD, json={
    "to": "+675550142",
    "body": "ping from python",
})
print(r.status_code, r.json())

# 3. ring a number and watch the status
call = requests.post(f"{API}/calls", headers=HEAD,
                     json={"to": "+12 483 9201", "type": "audio"}).json()["call"]
print("call", call["id"], "is", call["status"])

status = requests.get(f"{API}/calls/{call['id']}", headers=HEAD).json()
print(status["call"]["status"])   # ringing | ongoing | missed | ended

# 4. hang up
requests.post(f"{API}/calls/{call['id']}", headers=HEAD,
              json={"action": "hangup"})`;

  const js = `const API = "${origin}/api/v1";
const KEY = "nxk_YOUR_KEY";

const nexa = async (path, init) => {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      "Authorization": \`Bearer \${KEY}\`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

// send a text
await nexa("/messages", {
  method: "POST",
  body: JSON.stringify({ to: "+675550142", body: "yo from js" }),
});

// read my conversation with the guide bot
const { messages } = await nexa("/messages?peer=%2B300000000");
console.log(messages);`;

  return (
    <div className="noise relative min-h-screen bg-void text-zinc-100">
      <div className="relative mx-auto max-w-4xl px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[.25em] text-zinc-500 uppercase transition-colors hover:text-acid">
          <ArrowLeft size={13} /> nexa
        </Link>

        <div className="mt-10">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[.35em] text-cyanx uppercase">
            <Braces size={13} /> developer reference
          </div>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight sm:text-6xl">
            Program the <span className="text-stroke">wire.</span>
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-zinc-400">
            Every NEXA account owns an API key that acts as its number. Authenticate with a single
            header, exchange JSON, done. Works from Python, your server, a cron job — anything that
            speaks HTTP.
          </p>
        </div>

        {/* auth */}
        <section className="mt-14" id="auth">
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold">
            <KeyRound size={19} className="text-acid" /> Authentication
          </h2>
          <div className="mt-4 rounded-2xl border border-white/8 bg-panel/60 p-5 text-sm leading-relaxed text-zinc-400">
            Find your key in the NEXA app under{" "}
            <span className="text-zinc-200">Settings → Developer API</span>, then send it on every
            request — either as a bearer token or the <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-cyanx">x-api-key</code> header:
            <div className="mt-3 space-y-1.5 font-mono text-[13px]">
              <div className="rounded-xl border border-white/8 bg-void/70 px-4 py-2.5 text-zinc-300">
                Authorization: Bearer <span className="text-acid">nxk_…</span>
              </div>
              <div className="rounded-xl border border-white/8 bg-void/70 px-4 py-2.5 text-zinc-300">
                x-api-key: <span className="text-acid">nxk_…</span>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-[13px] text-amber-200/90">
              <ShieldAlert size={15} className="mt-0.5 shrink-0" />
              Keys are secret. Never ship them in browser-side JavaScript on a public site — call
              NEXA from your backend instead. Rotate instantly in Settings if one leaks.
            </div>
          </div>
        </section>

        {/* endpoints */}
        <section className="mt-14" id="endpoints">
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold">
            <BookOpen size={19} className="text-acid" /> Endpoints
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/8">
            {ENDPOINTS.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 border-b border-white/6 bg-panel/50 px-5 py-4 last:border-none sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`w-12 font-mono text-[12px] font-semibold ${e.accent}`}>{e.method}</span>
                  <code className="font-mono text-[13px] text-zinc-200">{e.path}</code>
                </div>
                <p className="text-[13px] text-zinc-500 sm:ml-auto sm:max-w-[46%]">{e.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-wider text-zinc-600">
            <Phone size={11} className="text-acid" />
            API-placed calls ring the recipient’s app but carry no media channel (signaling only) — for
            two-way audio/video, call from the NEXA web app.
          </p>
        </section>

        {/* examples */}
        <section className="mt-14 space-y-5" id="examples">
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold">
            <SendHorizontal size={19} className="text-acid" /> Client examples
          </h2>
          <CodeBlock title="python" lang="requests" code={python} />
          <CodeBlock title="curl" lang="bash" code={curl} />
          <CodeBlock title="javascript" lang="fetch" code={js} />
        </section>

        {/* responses */}
        <section className="mt-14" id="responses">
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold">
            <User size={19} className="text-acid" /> Responses & errors
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CodeBlock title="success — 201" lang="json" code={`{
  "message": {
    "id": 184,
    "fromPhone": "+120000001",
    "toPhone": "+675550142",
    "body": "ping from curl",
    "createdAt": "2026-01-01T12:00:00.000Z"
  }
}`} />
            <CodeBlock title="error — 404" lang="json" code={`{
  "error": "That number is not active on the NEXA network."
}

// status codes: 400 bad request · 401 bad key
// 403 forbidden · 404 unknown number · 409 conflict`} />
          </div>
        </section>

        <div className="mt-16 rounded-3xl border border-acid/20 bg-acid/[.05] p-8 text-center">
          <h3 className="font-display text-2xl font-bold">No key yet?</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
            Claim a number, open Settings in the app, and your developer key is waiting.
          </p>
          <Link
            href="/claim"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-acid px-7 py-3 font-display text-sm font-bold text-black transition-all hover:shadow-[0_0_36px_rgba(200,245,66,.5)] active:scale-95"
          >
            Claim a number <ArrowRight size={15} />
          </Link>
        </div>

        <footer className="mt-12 border-t border-white/8 pt-6 pb-10 text-center font-mono text-[10px] tracking-[.25em] text-zinc-700 uppercase">
          NEXA developer program — be kind to the wire
        </footer>
      </div>
    </div>
  );
}
