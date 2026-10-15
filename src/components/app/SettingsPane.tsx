"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Braces,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  RefreshCw,
  Shield,
  Volume2,
  VolumeX,
} from "lucide-react";
import * as api from "@/lib/client-api";
import type { Me } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { fmtDate } from "@/lib/format";
import { Avatar, toast } from "./ui";

export function SettingsPane({
  me,
  onLogout,
}: {
  me: Me;
  onLogout: () => void;
}) {
  const [apiKey, setApiKey] = useState(me.apiKey ?? "");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setMutedState(localStorage.getItem("nexa-muted") === "1");
    setOrigin(window.location.origin);
  }, []);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast("API key copied to clipboard", "ok");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Clipboard blocked by the browser", "err");
    }
  };

  const rotate = async () => {
    if (rotating) return;
    if (!window.confirm("Rotate your API key? The old key stops working immediately.")) return;
    setRotating(true);
    try {
      const key = await api.rotateKey();
      setApiKey(key);
      setRevealed(true);
      toast("New API key issued", "ok");
    } catch {
      toast("Could not rotate the key", "err");
    } finally {
      setRotating(false);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    localStorage.setItem("nexa-muted", next ? "1" : "0");
    toast(next ? "Interface sounds muted" : "Interface sounds on", "info");
  };

  const masked = apiKey ? `${apiKey.slice(0, 8)}${"•".repeat(20)}${apiKey.slice(-4)}` : "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">Settings</h1>
      </div>

      <div className="space-y-4 px-4 pb-8">
        {/* profile */}
        <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-white/[.05] to-transparent p-5">
          <div className="flex items-center gap-4">
            <Avatar name={me.username} hue={me.hue} size={64} online />
            <div className="min-w-0">
              <div className="font-display text-xl font-bold text-white">{me.username}</div>
              <div className="mt-0.5 font-mono text-sm tracking-[.15em] text-acid">
                {formatPhone(me.phone)}
              </div>
              <div className="mt-1 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
                subscriber since {fmtDate(me.createdAt)}
              </div>
            </div>
          </div>
          {me.isAdmin && (
            <a
              href="/admin"
              className="mt-4 flex items-center justify-between rounded-2xl border border-acid/25 bg-acid/10 px-4 py-3 transition-colors hover:bg-acid/15"
            >
              <span className="flex items-center gap-2 font-display text-sm font-semibold text-acid">
                <Shield size={15} /> Operator console
              </span>
              <ArrowUpRight size={15} className="text-acid" />
            </a>
          )}
        </div>

        {/* developer api */}
        <div className="rounded-3xl border border-white/8 bg-white/[.03] p-5">
          <div className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
            <KeyRound size={15} className="text-cyanx" /> Developer API key
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
            Call the NEXA REST API from Python, your website, anywhere. Send messages and ring
            lines as <span className="text-zinc-300">{me.username}</span>.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-void/70 px-3 py-2.5 font-mono text-[12px] tracking-wider text-cyanx">
              {revealed ? apiKey : masked}
            </code>
            <button
              onClick={() => setRevealed(!revealed)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-zinc-400 transition-all hover:text-white active:scale-90"
              title={revealed ? "Hide" : "Reveal"}
            >
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={() => void copyKey()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-zinc-400 transition-all hover:text-white active:scale-90"
              title="Copy"
            >
              {copied ? <Check size={15} className="text-acid" /> : <Copy size={15} />}
            </button>
            <button
              onClick={() => void rotate()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-zinc-400 transition-all hover:text-white active:scale-90"
              title="Rotate key"
            >
              <RefreshCw size={15} className={rotating ? "animate-spin" : ""} />
            </button>
          </div>

          <pre className="mt-3 overflow-x-auto rounded-xl border border-white/8 bg-void/80 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
{`curl -X POST ${origin}/api/v1/messages \\
  -H "Authorization: Bearer ${revealed ? apiKey : "<your-api-key>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+675550142", "body": "ping from curl"}'`}
          </pre>

          <a
            href="/developers"
            target="_blank"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-cyanx uppercase transition-colors hover:text-white"
          >
            <Braces size={12} /> full api reference <ArrowUpRight size={12} />
          </a>
        </div>

        {/* preferences */}
        <div className="rounded-3xl border border-white/8 bg-white/[.03] p-5">
          <div className="font-display text-[15px] font-bold text-white">Preferences</div>
          <button
            onClick={toggleMute}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-void/50 px-4 py-3 transition-colors hover:bg-white/[.04]"
          >
            <span className="flex items-center gap-2.5 text-sm text-zinc-300">
              {muted ? <VolumeX size={16} className="text-zinc-500" /> : <Volume2 size={16} className="text-acid" />}
              Interface sounds {muted ? "off" : "on"}
            </span>
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${muted ? "bg-white/10" : "bg-acid/90"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${muted ? "left-0.5" : "left-[22px]"}`}
              />
            </span>
          </button>
        </div>

        {/* session */}
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 py-3.5 font-display text-sm font-semibold text-red-400 transition-all hover:bg-red-500/15 active:scale-[.98]"
        >
          <LogOut size={15} /> Disconnect this device
        </button>
      </div>
    </div>
  );
}
