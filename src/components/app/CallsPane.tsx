"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Braces,
  MessageSquare,
  Phone,
  PhoneMissed,
  PhoneOutgoing,
  Video,
} from "lucide-react";
import * as api from "@/lib/client-api";
import type { CallHistoryItem } from "@/lib/client-api";
import type { Me } from "@/lib/types";
import { callDuration, fmtDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { usePoll } from "@/lib/use-poll";
import { Avatar, EmptyState, IconBtn, Spinner } from "./ui";

export function CallsPane({
  me,
  onCall,
  onMessage,
}: {
  me: Me;
  onCall: (peer: string, type: "audio" | "video") => void;
  onMessage: (peer: string) => void;
}) {
  const [calls, setCalls] = useState<CallHistoryItem[] | null>(null);
  const [names, setNames] = useState<Record<string, { username: string; hue: number }>>({});

  usePoll(async () => {
    try {
      const r = await api.callHistory();
      setCalls(r.calls);
      setNames(r.names);
    } catch {
      /* keep previous */
    }
  }, 4000);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">Calls</h1>
        <p className="mt-0.5 font-mono text-[11px] tracking-widest text-zinc-600 uppercase">
          every line · logged live
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {calls === null ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={22} />
          </div>
        ) : calls.length === 0 ? (
          <EmptyState
            icon={PhoneOutgoing}
            title="No calls yet"
            sub="Place your first call from the dial pad — voice or video, peer-to-peer over WebRTC."
          />
        ) : (
          calls.map((c) => {
            const info = names[c.peer];
            const missed = c.status === "missed";
            const declined = c.status === "declined";
            const outgoing = c.direction === "outgoing";
            const dur = callDuration(c.answeredAt, c.endedAt);

            return (
              <div
                key={c.id}
                className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[.04]"
              >
                <Avatar
                  name={info?.username ?? formatPhone(c.peer)}
                  hue={info?.hue ?? 220}
                  size={42}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate font-display text-[15px] font-semibold ${
                        missed && !outgoing ? "text-red-400" : "text-zinc-100"
                      }`}
                    >
                      {info?.username ?? "Unknown line"}
                    </span>
                    {c.viaApi && (
                      <span className="flex items-center gap-1 rounded-full border border-cyanx/25 bg-cyanx/10 px-1.5 py-px font-mono text-[9px] tracking-wider text-cyanx uppercase">
                        <Braces size={9} /> api
                      </span>
                    )}
                    {c.type === "video" && <Video size={12} className="shrink-0 text-zinc-600" />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-zinc-500">
                    {missed ? (
                      <PhoneMissed size={12} className="text-red-400" />
                    ) : outgoing ? (
                      <ArrowUpRight size={12} className="text-cyanx" />
                    ) : (
                      <ArrowDownLeft size={12} className={declined ? "text-amber-400" : "text-acid"} />
                    )}
                    <span className="font-mono tracking-wider">
                      {missed
                        ? outgoing
                          ? "no answer"
                          : "missed call"
                        : declined
                          ? "declined"
                          : dur
                            ? `${dur}`
                            : c.status}
                    </span>
                    <span className="text-zinc-700">·</span>
                    <span className="font-mono tracking-wider">{formatPhone(c.peer)}</span>
                  </div>
                </div>
                <span className="mr-1 shrink-0 font-mono text-[10px] text-zinc-600">
                  {fmtDate(c.createdAt)}
                </span>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <IconBtn icon={MessageSquare} label="Message" onClick={() => onMessage(c.peer)} />
                  <IconBtn icon={Phone} label="Call back" onClick={() => onCall(c.peer, "audio")} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
