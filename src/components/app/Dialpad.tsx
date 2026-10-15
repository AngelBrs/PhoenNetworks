"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Delete, MessageSquare, Phone, Signal, Video } from "lucide-react";
import * as api from "@/lib/client-api";
import type { Me, PeerInfo } from "@/lib/types";
import { dtmf, errorBuzz } from "@/lib/sounds";
import { formatPhone, PREFIXES } from "@/lib/phone";
import { Avatar, Spinner } from "./ui";

const KEYS: { d: string; sub?: string }[] = [
  { d: "1", sub: "◌" }, { d: "2", sub: "ABC" }, { d: "3", sub: "DEF" },
  { d: "4", sub: "GHI" }, { d: "5", sub: "JKL" }, { d: "6", sub: "MNO" },
  { d: "7", sub: "PQRS" }, { d: "8", sub: "TUV" }, { d: "9", sub: "WXYZ" },
  { d: "*", sub: "" }, { d: "0", sub: "+" }, { d: "#", sub: "" },
];

type LookupState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "found"; peer: PeerInfo }
  | { kind: "unknown" };

export function Dialpad({
  me,
  onCall,
  onMessage,
}: {
  me: Me;
  onCall: (peer: string, type: "audio" | "video") => void;
  onMessage: (peer: string) => void;
}) {
  const [digits, setDigits] = useState("");
  const [state, setState] = useState<LookupState>({ kind: "idle" });
  const lookupSeq = useRef(0);

  const phone = digits ? `+${digits}` : "";
  const prefixOk = PREFIXES.some((p) => digits.startsWith(p.slice(1)));
  const complete = prefixOk && digits.length === 10;

  const display = useMemo(() => {
    if (!digits) return "";
    if (complete) return formatPhone(phone);
    // group progressively: prefix + chunks of 3
    const prefixLen = digits.length >= 2 ? 2 : digits.length;
    const head = digits.slice(0, prefixLen);
    const rest = digits.slice(prefixLen);
    const grouped = rest.replace(/(\d{3})(?=\d)/g, "$1 ");
    return `+${head}${grouped ? " " + grouped : ""}`;
  }, [digits, complete, phone]);

  // live lookup once the number is complete
  useEffect(() => {
    if (!complete) {
      setState({ kind: "idle" });
      return;
    }
    const seq = ++lookupSeq.current;
    setState({ kind: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await api.lookup(phone);
        if (lookupSeq.current !== seq) return;
        if (r.found) {
          setState({
            kind: "found",
            peer: {
              phone: r.phone!,
              username: r.username!,
              hue: r.hue!,
              isBot: !!r.isBot,
              online: !!r.online,
            },
          });
        } else {
          setState({ kind: "unknown" });
          errorBuzz();
        }
      } catch {
        if (lookupSeq.current === seq) setState({ kind: "unknown" });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [complete, phone]);

  const press = (key: string) => {
    dtmf(key);
    if (key === "*" || key === "#") return;
    if (digits.length >= 10) return;
    setDigits((d) => {
      // first two digits must form a valid prefix
      const next = d + key;
      if (next.length <= 2) {
        const partial = PREFIXES.some((p) => p.slice(1).startsWith(next));
        if (!partial) return d;
      }
      if (next.length > 2 && !prefixOk) {
        const first2 = next.slice(0, 2);
        if (!PREFIXES.some((p) => p.slice(1) === first2)) return d;
      }
      return next;
    });
  };

  // hardware keyboard support
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9*#]$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") setDigits((d) => d.slice(0, -1));
      if (e.key === "Enter" && state.kind === "found") onCall(phone, "audio");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, phone, prefixOk]);

  const found = state.kind === "found";

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 py-6">
      {/* display */}
      <div className="w-full text-center">
        <div className="font-mono text-[11px] tracking-[.3em] text-zinc-600 uppercase">
          NEXA Trunk · {me.username}
        </div>
        <div
          className={`mt-2 min-h-[56px] font-mono text-[40px] font-medium tracking-wider transition-colors ${
            digits ? (found ? "text-acid" : "text-white") : "text-zinc-700"
          }`}
        >
          {display || "+__ ___ ____"}
        </div>

        {/* status line */}
        <div className="flex min-h-[52px] items-center justify-center">
          {state.kind === "checking" && (
            <span className="flex items-center gap-2 font-mono text-xs text-zinc-500">
              <Spinner size={13} /> probing the network…
            </span>
          )}
          {state.kind === "found" && (
            <span className="flex items-center gap-2 rounded-full border border-acid/25 bg-acid/10 px-3 py-1.5">
              <Avatar name={state.peer.username} hue={state.peer.hue} size={20} />
              <span className="font-display text-sm font-semibold text-acid">{state.peer.username}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${state.peer.online ? "bg-acid" : "bg-zinc-500"}`} />
            </span>
          )}
          {state.kind === "unknown" && (
            <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 font-mono text-xs text-red-400">
              number not on this network
            </span>
          )}
        </div>
      </div>

      {/* prefix chips */}
      <div className="mb-5 flex gap-2">
        {PREFIXES.map((p) => (
          <button
            key={p}
            onClick={() => {
              dtmf("1");
              setDigits(p.slice(1));
            }}
            className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-all active:scale-90 ${
              digits.startsWith(p.slice(1))
                ? "border-cyanx/50 bg-cyanx/15 text-cyanx"
                : "border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/25 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* keypad */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button
            key={k.d}
            onClick={() => press(k.d)}
            className="group flex h-[68px] w-[76px] flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[.03] transition-all hover:border-white/20 hover:bg-white/[.07] active:scale-95 active:bg-acid/10"
          >
            <span className="font-display text-[22px] font-semibold text-zinc-100 group-active:text-acid">
              {k.d}
            </span>
            {k.sub && <span className="font-mono text-[9px] tracking-[.25em] text-zinc-600">{k.sub}</span>}
          </button>
        ))}
      </div>

      {/* actions */}
      <div className="mt-6 flex items-center gap-5">
        <button
          onClick={() => found && onMessage(phone)}
          disabled={!found}
          className="flex h-13 w-13 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-zinc-300 transition-all hover:bg-white/10 active:scale-90 disabled:opacity-25"
          style={{ height: 52, width: 52 }}
          title="Message"
        >
          <MessageSquare size={19} />
        </button>
        <button
          onClick={() => found && onCall(phone, "audio")}
          disabled={!found}
          className="flex items-center justify-center rounded-full bg-acid text-black shadow-[0_8px_40px_rgba(200,245,66,.35)] transition-all hover:shadow-[0_8px_56px_rgba(200,245,66,.55)] active:scale-90 disabled:opacity-25 disabled:shadow-none"
          style={{ height: 68, width: 68 }}
          title="Call"
        >
          <Phone size={26} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => found && onCall(phone, "video")}
          disabled={!found}
          className="flex items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-zinc-300 transition-all hover:bg-white/10 active:scale-90 disabled:opacity-25"
          style={{ height: 52, width: 52 }}
          title="Video call"
        >
          <Video size={19} />
        </button>
        <button
          onClick={() => setDigits((d) => d.slice(0, -1))}
          className="flex items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-white active:scale-90"
          style={{ height: 52, width: 52 }}
          title="Delete"
        >
          <Delete size={20} />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 font-mono text-[10px] tracking-widest text-zinc-700 uppercase">
        <Signal size={11} className="text-acid/60" />
        +12 · +67 · +30 only — 7 digits after the prefix
      </div>
    </div>
  );
}
