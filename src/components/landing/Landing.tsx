"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  KeyRound,
  MessageSquare,
  Phone,
  Radio,
  Satellite,
  Signal,
  Video,
  Waves,
} from "lucide-react";
import type { NetworkStats } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { usePoll } from "@/lib/use-poll";

const TICKER_NUMBERS = [
  "+124839201", "+675550142", "+300000000", "+129473650", "+674812093",
  "+307291845", "+125839201", "+672938475", "+308475621", "+126574839",
  "+679384756", "+304857261",
];

export function Landing() {
  return (
    <div className="noise relative min-h-screen overflow-x-clip bg-void text-zinc-100">
      <Nav />
      <Hero />
      <StatsBand />
      <Prefixes />
      <HowItWorks />
      <DevTeaser />
      <FinalCta />
      <Footer />
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-acid font-display text-base font-black text-black">
            N
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            NEXA<span className="text-acid">.</span>
          </span>
          <span className="hidden font-mono text-[9px] tracking-[.3em] text-zinc-600 uppercase sm:inline">
            network
          </span>
        </Link>
        <nav className="hidden items-center gap-7 font-mono text-[11px] tracking-[.2em] text-zinc-400 uppercase md:flex">
          <a href="#network" className="transition-colors hover:text-acid">Network</a>
          <a href="#prefixes" className="transition-colors hover:text-acid">Prefixes</a>
          <Link href="/developers" className="transition-colors hover:text-acid">Developers</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 font-mono text-[11px] tracking-widest text-zinc-300 uppercase transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/claim"
            className="rounded-full bg-acid px-4 py-2 font-display text-[13px] font-bold text-black transition-all hover:shadow-[0_0_28px_rgba(200,245,66,.5)] active:scale-95"
          >
            Claim a line
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────
function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);

  const tilt = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 12}deg)`;
  };
  const untilt = () => {
    if (cardRef.current) cardRef.current.style.transform = "perspective(900px)";
  };

  return (
    <section className="relative overflow-hidden pt-28" id="network">
      <SignalCanvas />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(200,245,66,.06),transparent_50%)]" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pt-14 pb-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div className="animate-[rise_.8s_cubic-bezier(.21,1.02,.73,1)_both]">
          <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[.35em] text-acid uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acid" />
            +12 · +67 · +30 — trunks live
          </div>
          <h1 className="mt-5 font-display text-[clamp(3rem,8.5vw,6.2rem)] leading-[.95] font-bold tracking-tight">
            PICK A NUMBER.
            <br />
            <span className="text-stroke">OWN THE WIRE.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-400">
            NEXA is a phone network that lives in your browser. Claim a line on one of three
            prefixes, then text, voice-call and video-call anyone on the grid — or drive the whole
            thing from your own code.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/claim"
              className="group flex items-center gap-2 rounded-full bg-acid px-7 py-3.5 font-display text-[15px] font-bold text-black transition-all hover:shadow-[0_0_40px_rgba(200,245,66,.55)] active:scale-95"
            >
              Claim your number
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/developers"
              className="flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 font-display text-[15px] font-semibold text-zinc-200 transition-all hover:border-cyanx/50 hover:text-cyanx active:scale-95"
            >
              <Braces size={16} /> Developer API
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 font-mono text-[10px] tracking-[.25em] text-zinc-600 uppercase">
            <span className="flex items-center gap-1.5"><MessageSquare size={11} className="text-acid" /> texts</span>
            <span className="flex items-center gap-1.5"><Phone size={11} className="text-acid" /> voice</span>
            <span className="flex items-center gap-1.5"><Video size={11} className="text-acid" /> video</span>
            <span className="flex items-center gap-1.5"><KeyRound size={11} className="text-acid" /> rest api</span>
          </div>
        </div>

        {/* floating SIM card */}
        <div
          className="relative mx-auto hidden w-full max-w-sm animate-[rise_.8s_.15s_cubic-bezier(.21,1.02,.73,1)_both] sm:block"
          onMouseMove={tilt}
          onMouseLeave={untilt}
        >
          <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-acid/15 blur-[90px]" />
          <div
            ref={cardRef}
            className="relative transition-transform duration-200 ease-out animate-[floaty_5s_ease-in-out_infinite]"
          >
            <Image
              src="/images/sim-card.png"
              alt="NEXA glass SIM card"
              width={640}
              height={640}
              className="w-full rounded-[2.5rem]"
              priority
            />
          </div>
          <div className="glass absolute -bottom-5 left-1/2 flex w-[85%] -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-acid opacity-70" />
              <span className="h-full w-full rounded-full bg-acid" />
            </span>
            <span className="font-mono text-sm tracking-[.18em] text-zinc-200">
              {formatPhone("+124839201")}
            </span>
            <span className="ml-auto font-mono text-[10px] tracking-widest text-acid uppercase">
              line active
            </span>
          </div>
        </div>
      </div>

      {/* number ticker */}
      <div className="relative border-y border-white/8 bg-panel/40 py-3.5">
        <div className="flex overflow-hidden">
          <div className="flex shrink-0 animate-[marquee_36s_linear_infinite] items-center gap-10 pr-10">
            {[...TICKER_NUMBERS, ...TICKER_NUMBERS].map((n, i) => (
              <span key={i} className="flex items-center gap-10 font-mono text-[13px] tracking-[.25em] text-zinc-500">
                {formatPhone(n)}
                <Signal size={11} className={i % 3 === 0 ? "text-acid" : "text-cyanx"} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Live stats ─────────────────────────────────────────────────────────
function StatsBand() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  usePoll(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (res.ok) setStats(await res.json());
    } catch {
      /* ignore */
    }
  }, 5000);

  const items = [
    { label: "lines on the grid", value: stats?.users },
    { label: "online right now", value: stats?.online, live: true },
    { label: "messages routed", value: stats?.messages },
    { label: "calls connected", value: stats?.calls },
    { label: "api requests", value: stats?.apiRequests },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/8 bg-white/5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it) => (
          <div key={it.label} className="bg-void p-6 text-center">
            <div className={`font-mono text-3xl font-semibold tracking-tight sm:text-4xl ${it.live ? "text-acid animate-[pulse-glow_2.4s_ease-in-out_infinite]" : "text-white"}`}>
              {it.value === undefined ? "——" : it.value.toLocaleString()}
            </div>
            <div className="mt-2 font-mono text-[10px] tracking-[.2em] text-zinc-600 uppercase">
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Prefixes ───────────────────────────────────────────────────────────
function Prefixes() {
  const blocks = [
    {
      p: "+12",
      name: "METROLINE",
      desc: "The city trunk. First prefix ever issued — home of the operator line itself.",
      hue: "text-acid",
      border: "hover:border-acid/40",
    },
    {
      p: "+67",
      name: "COASTAL GRID",
      desc: "Salt in the air, signal in the clear. The busiest social exchange on NEXA.",
      hue: "text-cyanx",
      border: "hover:border-cyanx/40",
    },
    {
      p: "+30",
      name: "ORBITAL RELAY",
      desc: "Bounced off the constellation. Where the bots and the night owls live.",
      hue: "text-violetx",
      border: "hover:border-violetx/40",
    },
  ];

  return (
    <section id="prefixes" className="mx-auto max-w-6xl px-5 py-20">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] tracking-[.35em] text-acid uppercase">02 — the trunks</div>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Three prefixes. <span className="text-stroke-white">Zero borders.</span>
          </h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {blocks.map((b) => (
          <div
            key={b.p}
            className={`group relative overflow-hidden rounded-3xl border border-white/8 bg-panel/60 p-7 transition-all ${b.border}`}
          >
            <div className="absolute -top-8 -right-4 font-display text-[110px] leading-none font-black text-white/[.03] transition-colors group-hover:text-white/[.05] select-none">
              {b.p}
            </div>
            <Satellite size={18} className={b.hue} />
            <div className={`mt-6 font-mono text-5xl font-semibold tracking-tight ${b.hue}`}>{b.p}</div>
            <div className="mt-1.5 font-mono text-[11px] tracking-[.3em] text-zinc-500">{b.name}</div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{b.desc}</p>
            <div className="mt-6 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
              <Waves size={11} className={b.hue} /> + 7 digits of pure you
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── How it works ───────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "CLAIM",
      desc: "Shuffle a fresh batch of numbers across +12, +67 and +30. Tap the one that feels like yours, pick a username, set a password.",
      icon: Signal,
    },
    {
      n: "02",
      title: "CONNECT",
      desc: "Dial any line on the grid. Messages land instantly, voice and video ride peer-to-peer over WebRTC, presence glows in real time.",
      icon: Phone,
    },
    {
      n: "03",
      title: "CREATE",
      desc: "Every line ships with a developer key. Send texts and ring numbers from Python, cURL or your own site with one HTTP call.",
      icon: Braces,
    },
  ];

  return (
    <section className="border-y border-white/8 bg-panel/30 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="font-mono text-[11px] tracking-[.35em] text-acid uppercase">03 — the flow</div>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Live in sixty seconds
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="group relative rounded-3xl border border-white/8 bg-void/60 p-7 transition-colors hover:border-white/20">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-acid">{s.n}</span>
                <s.icon size={20} className="text-zinc-600 transition-colors group-hover:text-acid" />
              </div>
              <div className="mt-8 font-display text-2xl font-bold tracking-widest">{s.title}</div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Developer teaser ───────────────────────────────────────────────────
function DevTeaser() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-24 lg:grid-cols-2">
      <div>
        <div className="font-mono text-[11px] tracking-[.35em] text-cyanx uppercase">04 — the api</div>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          A phone network
          <br />
          with a <span className="text-cyanx">REST API</span>
        </h2>
        <p className="mt-5 max-w-md leading-relaxed text-zinc-400">
          Every NEXA line carries an API key. Send messages, read your inbox and place calls from
          any language that speaks HTTP — responses are plain JSON.
        </p>
        <Link
          href="/developers"
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-cyanx/40 bg-cyanx/10 px-6 py-3 font-display text-sm font-bold text-cyanx transition-all hover:bg-cyanx/20 active:scale-95"
        >
          Read the docs <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#070a11] shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-acid/70" />
          <span className="ml-3 font-mono text-[10px] tracking-widest text-zinc-600">nexa_client.py</span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-6 text-zinc-300">
<span className="text-violetx">import</span> requests{"\n\n"}
API = <span className="text-acid">"https://your-nexa.host/api/v1"</span>{"\n"}
KEY = <span className="text-acid">"nxk_•••"</span>{"\n\n"}
<span className="text-zinc-600"># send a text from your number</span>{"\n"}
requests.<span className="text-cyanx">post</span>(<span className="text-acid">f"{"{API}"}/messages"</span>,{"\n"}
{"  "}headers={"{"}<span className="text-acid">"Authorization"</span>: <span className="text-acid">f"Bearer {"{KEY}"}"</span>{"}"},{"\n"}
{"  "}json={"{"}<span className="text-acid">"to"</span>: <span className="text-acid">"+675550142"</span>, <span className="text-acid">"body"</span>: <span className="text-acid">"hello from python"</span>{"}"}){"\n\n"}
<span className="text-zinc-600"># ring a number — it lights up their NEXA app</span>{"\n"}
requests.<span className="text-cyanx">post</span>(<span className="text-acid">f"{"{API}"}/calls"</span>, headers=..., json={"{"}<span className="text-acid">"to"</span>: <span className="text-acid">"+124839201"</span>, <span className="text-acid">"type"</span>: <span className="text-acid">"audio"</span>{"}"})
        </pre>
      </div>
    </section>
  );
}

// ── Final CTA ──────────────────────────────────────────────────────────
function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/8 py-24">
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(200,245,66,.1),transparent_60%)]" />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <Radio size={28} className="mx-auto text-acid" />
        <h2 className="mt-5 font-display text-5xl font-bold tracking-tight sm:text-6xl">
          The wire is <span className="text-stroke">humming.</span>
        </h2>
        <p className="mt-4 text-zinc-400">
          Numbers are issued first-come, first-served. Once a line is claimed, it&apos;s gone.
        </p>
        <Link
          href="/claim"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-acid px-9 py-4 font-display text-base font-bold text-black transition-all hover:shadow-[0_0_50px_rgba(200,245,66,.6)] active:scale-95"
        >
          Claim your number <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 font-mono text-[10px] tracking-[.2em] text-zinc-600 uppercase sm:flex-row">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-acid font-display text-xs font-black text-black">N</span>
          NEXA — the people&apos;s phone network
        </span>
        <div className="flex items-center gap-5">
          <Link href="/developers" className="transition-colors hover:text-acid">api docs</Link>
          <Link href="/login" className="transition-colors hover:text-acid">sign in</Link>
          <Link href="/admin" className="transition-colors hover:text-acid">operator</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Signal constellation canvas ────────────────────────────────────────
function SignalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Node = { x: number; y: number; vx: number; vy: number };
    let nodes: Node[] = [];

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(85, Math.floor((w * h) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const LINK = 130;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const alpha = (1 - d / LINK) * 0.14;
            ctx.strokeStyle = `rgba(200,245,66,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = "rgba(200,245,66,.5)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />;
}
