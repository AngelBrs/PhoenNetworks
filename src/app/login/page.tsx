"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Radio, User } from "lucide-react";
import * as api from "@/lib/client-api";
import { Spinner, toast } from "@/components/app/ui";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Enter your credentials.");
      return;
    }
    setBusy(true);
    try {
      const me = await api.login(identifier.trim(), password);
      toast(`Back on the wire, ${me.username}`, "ok");
      window.location.href = me.isAdmin ? "/admin" : "/app";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
      setBusy(false);
    }
  };

  return (
    <div className="noise relative flex min-h-screen items-center justify-center bg-void px-5 text-zinc-100">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(84,224,255,.07),transparent_55%)]" />

      <div className="relative w-full max-w-md animate-[rise_.6s_cubic-bezier(.21,1.02,.73,1)_both]">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] tracking-[.25em] text-zinc-500 uppercase transition-colors hover:text-acid">
          <ArrowLeft size={13} /> back to the grid
        </Link>

        <div className="rounded-3xl border border-white/10 bg-panel/70 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-acid font-display text-2xl font-black text-black shadow-[0_0_38px_rgba(200,245,66,.35)]">
            N
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">Sign back in</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-500">
            <Radio size={13} className="text-acid" /> reunite with your line, on any device
          </p>

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] tracking-[.25em] text-zinc-500 uppercase">
                <User size={11} /> username or number
              </span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder="Angelbrs12 or +12 000 0001"
                autoComplete="username"
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
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 font-mono text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={() => void submit()}
            disabled={busy}
            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-acid py-4 font-display text-[15px] font-bold text-black transition-all hover:shadow-[0_0_36px_rgba(200,245,66,.45)] active:scale-[.98] disabled:opacity-40"
          >
            {busy ? <Spinner size={16} className="text-black" /> : <>Reconnect <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></>}
          </button>

          <p className="mt-5 text-center font-mono text-[11px] tracking-wider text-zinc-600">
            no line yet?{" "}
            <Link href="/claim" className="text-acid transition-colors hover:text-white">
              claim a number
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
