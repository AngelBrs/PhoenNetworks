"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dices,
  Eye,
  EyeOff,
  KeyRound,
  Radio,
  RefreshCw,
  User,
} from "lucide-react";
import * as api from "@/lib/client-api";
import { formatPhone, prefixOf } from "@/lib/phone";
import { Spinner, toast } from "@/components/app/ui";

const PREFIX_STYLE: Record<string, string> = {
  "+12": "text-acid",
  "+67": "text-cyanx",
  "+30": "text-violetx",
};

export default function ClaimPage() {
  const [numbers, setNumbers] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [shuffling, setShuffling] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setShuffling(true);
    try {
      const list = await api.availableNumbers(12);
      setNumbers(list);
      setSelected(null);
    } catch {
      toast("Could not reach the exchange — retry", "err");
    } finally {
      setShuffling(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claim = async () => {
    if (!selected || busy) return;
    setError(null);
    if (!/^[A-Za-z0-9._-]{3,20}$/.test(username)) {
      setError("Username: 3–20 chars — letters, digits, dot, dash, underscore.");
      return;
    }
    if (password.length < 4) {
      setError("Password needs at least 4 characters.");
      return;
    }
    setBusy(true);
    try {
      await api.register(selected, username, password);
      toast("Line connected. Welcome to the network.", "ok");
      window.location.href = "/app";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed — try again.");
      setBusy(false);
    }
  };

  const ready = !!selected && username.length >= 3 && password.length >= 4;

  return (
    <div className="noise relative min-h-screen bg-void text-zinc-100">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_-10%,rgba(200,245,66,.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-mono text-[11px] tracking-[.25em] text-zinc-500 uppercase transition-colors hover:text-acid">
            <ArrowLeft size={14} /> nexa
          </Link>
          <Link href="/login" className="font-mono text-[11px] tracking-[.25em] text-zinc-500 uppercase transition-colors hover:text-acid">
            have a line? sign in
          </Link>
        </div>

        <div className="mt-12 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[.35em] text-acid uppercase">
            <Radio size={13} /> exchange open
          </div>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight sm:text-6xl">
            Pick your <span className="text-stroke">number.</span>
          </h1>
          <p className="mt-3 text-zinc-400">
            Twelve fresh lines straight off the exchange, across{" "}
            <span className="font-mono text-acid">+12</span>,{" "}
            <span className="font-mono text-cyanx">+67</span> and{" "}
            <span className="font-mono text-violetx">+30</span>. First come, first connected.
          </p>
        </div>

        {/* number grid */}
        <div className="mt-8 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[.3em] text-zinc-600 uppercase">
            available on the exchange
          </span>
          <button
            onClick={() => void load()}
            disabled={shuffling}
            className="flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 font-mono text-[11px] tracking-widest text-zinc-300 uppercase transition-all hover:border-acid/40 hover:text-acid active:scale-95 disabled:opacity-40"
          >
            {shuffling ? <RefreshCw size={13} className="animate-spin" /> : <Dices size={13} />}
            shuffle
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {numbers === null
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-white/6 bg-white/[.03]" />
              ))
            : numbers.map((n) => {
                const prefix = prefixOf(n) ?? "";
                const active = selected === n;
                return (
                  <button
                    key={n}
                    onClick={() => setSelected(n)}
                    className={`group relative flex h-[92px] flex-col items-center justify-center rounded-2xl border transition-all active:scale-[.97] ${
                      active
                        ? "border-acid bg-acid/10 shadow-[0_0_36px_rgba(200,245,66,.2)]"
                        : "border-white/8 bg-panel/60 hover:border-white/25"
                    }`}
                  >
                    <span className="font-mono text-[9px] tracking-[.3em] text-zinc-600 uppercase">
                      {active ? "selected" : "open line"}
                    </span>
                    <span
                      className={`mt-1 font-mono text-lg font-medium tracking-[.08em] ${
                        active ? "text-white" : PREFIX_STYLE[prefix] ?? "text-zinc-200"
                      }`}
                    >
                      {formatPhone(n)}
                    </span>
                    {active && (
                      <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-acid text-black">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
        </div>

        {/* identity form */}
        <div
          className={`mt-8 overflow-hidden rounded-3xl border transition-all duration-500 ${
            selected ? "border-white/12 bg-panel/70 opacity-100" : "pointer-events-none border-white/5 opacity-40"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-6 py-4">
            <span className="font-mono text-[10px] tracking-[.3em] text-zinc-500 uppercase">your line</span>
            <span className="font-mono text-lg tracking-[.12em] text-acid">
              {selected ? formatPhone(selected) : "+__ ___ ____"}
            </span>
            <span className="ml-auto font-mono text-[10px] tracking-[.3em] text-zinc-600 uppercase">
              step 2 — set credentials
            </span>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] tracking-[.25em] text-zinc-500 uppercase">
                <User size={11} /> username
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="night.rider"
                autoComplete="off"
                className="w-full rounded-2xl border border-white/10 bg-void/70 px-4 py-3.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-acid/45"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] tracking-[.25em] text-zinc-500 uppercase">
                <KeyRound size={11} /> password
              </span>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void claim()}
                  placeholder="min. 4 characters"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-void/70 px-4 py-3.5 pr-12 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-acid/45"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-600 transition-colors hover:text-white"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>
          {error && (
            <div className="mx-6 mb-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 font-mono text-xs text-red-400">
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6">
            <p className="font-mono text-[10px] leading-relaxed tracking-wider text-zinc-600 uppercase">
              credentials work on any device —<br className="sm:hidden" /> your number is your identity
            </p>
            <button
              onClick={() => void claim()}
              disabled={!ready || busy}
              className="group flex items-center gap-2 rounded-full bg-acid px-8 py-3.5 font-display text-sm font-bold text-black transition-all hover:shadow-[0_0_36px_rgba(200,245,66,.5)] active:scale-95 disabled:opacity-30 disabled:shadow-none"
            >
              {busy ? <Spinner size={15} className="text-black" /> : <>Connect my line <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
