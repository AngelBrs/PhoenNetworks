"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Bot,
  Braces,
  KeyRound,
  Lock,
  Megaphone,
  MessageSquare,
  Phone,
  PhoneCall,
  SendHorizontal,
  Shield,
  ShieldOff,
  ShieldPlus,
  Signal,
  Trash2,
  Users,
} from "lucide-react";
import * as api from "@/lib/client-api";
import { formatPhone } from "@/lib/phone";
import { fmtDate, timeAgo } from "@/lib/format";
import { usePoll } from "@/lib/use-poll";
import { Avatar, Spinner, Toaster, toast } from "@/components/app/ui";

type AdminUser = {
  id: number;
  phone: string;
  username: string;
  isAdmin: boolean;
  isBot: boolean;
  hue: number;
  createdAt: string;
  lastSeenAt: string;
  online: boolean;
  apiKeyPreview: string;
};

type Stats = {
  users: number;
  online: number;
  messages: number;
  calls: number;
  apiRequests: number;
};

type ApiLogRow = {
  id: number;
  endpoint: string;
  status: number;
  createdAt: string;
  phone: string;
  username: string;
};

const PROTECTED = "Angelbrs12";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<ApiLogRow[]>([]);
  const [broadcast, setBroadcast] = useState("");
  const [busyBroadcast, setBusyBroadcast] = useState(false);
  const [query, setQuery] = useState("");

  usePoll(async () => {
    try {
      await api.getMe();
      setAuthorized(true);
    } catch {
      setAuthorized(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.status === 403) {
        setAuthorized(false);
        return;
      }
      if (res.ok) setUsers((await res.json()).users);
    } catch {
      /* ignore */
    }
  }, 5000);

  usePoll(async () => {
    if (!authorized) return;
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setLogs(data.apiLogs);
      }
    } catch {
      /* ignore */
    }
  }, 4000, [authorized]);

  const act = async (id: number, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast("Done", "ok");
      const list = await fetch("/api/admin/users", { cache: "no-store" });
      if (list.ok) setUsers((await list.json()).users);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed", "err");
    }
  };

  const del = async (u: AdminUser) => {
    if (!window.confirm(`Release ${formatPhone(u.phone)} (${u.username}) and delete the account? Their conversations stay, the number goes back on the exchange.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Released ${formatPhone(u.phone)} back to the exchange`, "ok");
      setUsers((prev) => prev?.filter((x) => x.id !== u.id) ?? null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "err");
    }
  };

  const resetPassword = async (u: AdminUser) => {
    const pw = window.prompt(`New password for ${u.username} (min 4 chars):`);
    if (!pw) return;
    await act(u.id, { action: "resetPassword", password: pw });
  };

  const sendBroadcast = async () => {
    const body = broadcast.trim();
    if (!body || busyBroadcast) return;
    setBusyBroadcast(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Broadcast delivered to ${data.delivered} lines`, "ok");
      setBroadcast("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Broadcast failed", "err");
    } finally {
      setBusyBroadcast(false);
    }
  };

  if (authorized === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-void">
        <Spinner size={22} />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="noise flex h-dvh flex-col items-center justify-center gap-4 bg-void px-5 text-center">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
          <Lock size={28} className="text-red-400" />
        </div>
        <h1 className="font-display text-3xl font-bold">Operator access only</h1>
        <p className="max-w-sm text-sm text-zinc-500">
          This console manages every line on the network. Sign in with the operator account
          <span className="font-mono text-acid"> Angelbrs12 </span> to continue.
        </p>
        <Link
          href="/login"
          className="mt-2 rounded-full bg-acid px-7 py-3 font-display text-sm font-bold text-black transition-all hover:shadow-[0_0_36px_rgba(200,245,66,.5)] active:scale-95"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const statCards: { label: string; icon: typeof Users; value?: number; tint: string }[] = [
    { label: "lines issued", icon: Phone, value: stats?.users, tint: "text-acid" },
    { label: "online now", icon: Signal, value: stats?.online, tint: "text-acid" },
    { label: "messages routed", icon: MessageSquare, value: stats?.messages, tint: "text-cyanx" },
    { label: "calls placed", icon: PhoneCall, value: stats?.calls, tint: "text-violetx" },
    { label: "api requests", icon: Braces, value: stats?.apiRequests, tint: "text-amber-300" },
  ];

  const filtered = (users ?? []).filter(
    (u) =>
      !query ||
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.phone.includes(query.replace(/\D/g, "")),
  );

  return (
    <div className="noise min-h-screen bg-void text-zinc-100">
      <Toaster />
      <header className="sticky top-0 z-40 border-b border-white/8 bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5">
          <Link href="/app" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft size={15} />
          </Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-acid font-display text-base font-black text-black">N</span>
          <div className="font-display text-lg font-bold">
            Operator console<span className="text-acid">.</span>
          </div>
          <span className="ml-auto flex items-center gap-2 rounded-full border border-acid/25 bg-acid/10 px-3 py-1 font-mono text-[10px] tracking-widest text-acid uppercase">
            <Shield size={11} /> {PROTECTED}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        {/* stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-3xl border border-white/8 bg-panel/60 p-5">
              <s.icon size={17} className={s.tint} />
              <div className="mt-3 font-mono text-3xl font-semibold text-white">
                {s.value === undefined ? "——" : s.value.toLocaleString()}
              </div>
              <div className="mt-1 font-mono text-[9.5px] tracking-[.2em] text-zinc-600 uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* broadcast */}
        <div className="rounded-3xl border border-white/8 bg-panel/60 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Megaphone size={17} className="text-acid" /> Network broadcast
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Push a message from the operator line to every subscriber&apos;s inbox.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void sendBroadcast()}
              maxLength={500}
              placeholder="Maintenance at 04:00 UTC — the wire hums on…"
              className="flex-1 rounded-2xl border border-white/10 bg-void/70 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-acid/45"
            />
            <button
              onClick={() => void sendBroadcast()}
              disabled={!broadcast.trim() || busyBroadcast}
              className="flex items-center gap-2 rounded-2xl bg-acid px-5 font-display text-sm font-bold text-black transition-all active:scale-95 disabled:opacity-30"
            >
              {busyBroadcast ? <Spinner size={14} className="text-black" /> : <SendHorizontal size={15} />}
              Blast
            </button>
          </div>
        </div>

        {/* users */}
        <div className="rounded-3xl border border-white/8 bg-panel/60">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-6 py-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Users size={17} className="text-acid" /> Lines on the network
            </h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="filter by name or number…"
              className="ml-auto w-56 rounded-xl border border-white/10 bg-void/70 px-3 py-2 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-acid/45"
            />
          </div>

          <div className="divide-y divide-white/5">
            {users === null ? (
              <div className="flex justify-center py-14"><Spinner size={22} /></div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center font-mono text-xs text-zinc-600">no lines match</div>
            ) : (
              filtered.map((u) => {
                const locked = u.username === PROTECTED;
                return (
                  <div key={u.id} className="flex flex-wrap items-center gap-3 px-6 py-3.5 transition-colors hover:bg-white/[.02]">
                    <Avatar name={u.username} hue={u.hue} size={38} online={u.online} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-display text-[15px] font-semibold text-white">{u.username}</span>
                        {u.isAdmin && <Shield size={12} className="shrink-0 text-acid" />}
                        {u.isBot && <Bot size={12} className="shrink-0 text-cyanx" />}
                        {locked && <Lock size={11} className="shrink-0 text-zinc-600" />}
                      </div>
                      <div className="font-mono text-[11px] tracking-wider text-zinc-500">
                        {formatPhone(u.phone)}
                        <span className="text-zinc-700"> · id {u.id} · </span>
                        {u.online ? <span className="text-acid">online</span> : <span>seen {timeAgo(u.lastSeenAt)}</span>}
                        <span className="text-zinc-700"> · joined {fmtDate(u.createdAt)}</span>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <code className="hidden rounded-lg border border-white/8 bg-void/60 px-2 py-1 font-mono text-[10px] text-zinc-500 lg:block">
                        {u.apiKeyPreview}
                      </code>
                      <button
                        onClick={() => resetPassword(u)}
                        title="Reset password"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-all hover:border-cyanx/40 hover:text-cyanx active:scale-90"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        onClick={() => act(u.id, { action: "toggleAdmin" }, u.isAdmin ? `Demote ${u.username} from operator?` : `Promote ${u.username} to operator?`)}
                        disabled={locked}
                        title={u.isAdmin ? "Revoke admin" : "Grant admin"}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-all hover:border-violetx/40 hover:text-violetx active:scale-90 disabled:opacity-25"
                      >
                        {u.isAdmin ? <ShieldOff size={13} /> : <ShieldPlus size={13} />}
                      </button>
                      <button
                        onClick={() => void del(u)}
                        disabled={locked}
                        title="Release number & delete"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-all hover:border-red-500/40 hover:text-red-400 active:scale-90 disabled:opacity-25"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* api traffic */}
        <div className="rounded-3xl border border-white/8 bg-panel/60">
          <div className="flex items-center gap-2 border-b border-white/8 px-6 py-4">
            <Activity size={16} className="text-amber-300" />
            <h2 className="font-display text-lg font-bold">Developer API traffic</h2>
            <span className="ml-auto font-mono text-[10px] tracking-widest text-zinc-600 uppercase">latest 30</span>
          </div>
          <div className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-zinc-600">
                no api traffic yet — grab a key and hit /api/v1/*
              </div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-6 py-2.5">
                  <span
                    className={`w-10 shrink-0 rounded-md px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold ${
                      l.status < 300 ? "bg-acid/10 text-acid" : l.status < 500 ? "bg-amber-400/10 text-amber-300" : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {l.status}
                  </span>
                  <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-300">{l.endpoint}</code>
                  <span className="hidden font-mono text-[11px] text-zinc-500 sm:block">{l.username}</span>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-600">{timeAgo(l.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="pb-6 text-center font-mono text-[10px] tracking-[.25em] text-zinc-700 uppercase">
          NEXA operations — with great power comes great dial tone
        </footer>
      </main>
    </div>
  );
}
