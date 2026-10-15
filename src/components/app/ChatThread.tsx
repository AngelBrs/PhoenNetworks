"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  MessagesSquare,
  Phone,
  SendHorizonal,
  Video,
} from "lucide-react";
import * as api from "@/lib/client-api";
import type { Me, MessageDto, PeerInfo } from "@/lib/types";
import { messagePop, sentWhoosh } from "@/lib/sounds";
import { dayLabel, fmtTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { usePoll } from "@/lib/use-poll";
import { Avatar, EmptyState, IconBtn, Spinner, toast } from "./ui";

export function ChatThread({
  me,
  peer,
  onBack,
  onCall,
}: {
  me: Me;
  peer: string;
  onBack: () => void;
  onCall: (peer: string, type: "audio" | "video") => void;
}) {
  const [info, setInfo] = useState<PeerInfo | null>(null);
  const [msgs, setMsgs] = useState<MessageDto[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIncomingId = useRef(0);
  const stickBottom = useRef(true);

  const loadInfo = async () => {
    try {
      const r = await api.lookup(peer);
      if (r.found) {
        setInfo({
          phone: r.phone!,
          username: r.username!,
          hue: r.hue!,
          isBot: !!r.isBot,
          online: !!r.online,
        });
      }
    } catch {
      /* ignore */
    }
  };
  usePoll(loadInfo, 10_000, [peer]);

  const loadMsgs = async () => {
    try {
      const list = await api.getMessages(peer);
      setMsgs((prev) => {
        const newestIncoming = [...list].reverse().find((m) => m.fromPhone === peer);
        if (newestIncoming && newestIncoming.id > lastIncomingId.current) {
          const isFirstLoad = prev === null;
          lastIncomingId.current = newestIncoming.id;
          if (!isFirstLoad) {
            messagePop();
            void api.markRead(peer).catch(() => {});
          } else {
            void api.markRead(peer).catch(() => {});
          }
        }
        return list;
      });
    } catch {
      /* keep old state */
    }
  };
  usePoll(loadMsgs, 1500, [peer, me.phone]);

  useEffect(() => {
    setMsgs(null);
    setDraft("");
    lastIncomingId.current = 0;
    void api.markRead(peer).catch(() => {});
  }, [peer]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const m = await api.sendMessage(peer, body);
      sentWhoosh();
      setDraft("");
      setMsgs((prev) => (prev ? [...prev, m] : [m]));
      stickBottom.current = true;
      void loadMsgs();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to send", "err");
    } finally {
      setSending(false);
    }
  };

  let lastDay = "";

  return (
    <div className="flex h-full flex-col bg-void">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-white/8 bg-panel/60 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 lg:hidden"
        >
          <ArrowLeft size={18} />
        </button>
        {info ? (
          <>
            <Avatar name={info.username} hue={info.hue} size={40} online={info.online} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-white">
                <span className="truncate">{info.username}</span>
                {info.isBot && <Bot size={13} className="shrink-0 text-cyanx" />}
              </div>
              <div className="font-mono text-[11px] tracking-wider text-zinc-500">
                {info.online ? (
                  <span className="text-acid">● live on the wire</span>
                ) : (
                  formatPhone(peer)
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <Spinner />
          </div>
        )}
        <IconBtn icon={Phone} label="Voice call" onClick={() => onCall(peer, "audio")} />
        <IconBtn icon={Video} label="Video call" onClick={() => onCall(peer, "video")} />
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="flex-1 overflow-y-auto px-4 py-5"
      >
        {msgs === null ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={22} />
          </div>
        ) : msgs.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Open the channel"
            sub={`Say something to ${info?.username ?? formatPhone(peer)} — the first transmission sets the tone.`}
          />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
            {msgs.map((m, i) => {
              const day = dayLabel(m.createdAt);
              const showDay = day !== lastDay;
              lastDay = day;
              const prev = msgs[i - 1];
              const tight = !showDay && prev && prev.fromPhone === m.fromPhone &&
                new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 120_000;
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
                        {day}
                      </span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                  )}
                  <div className={`flex ${m.mine ? "justify-end" : "justify-start"} ${tight ? "" : "mt-2.5"}`}>
                    <div
                      className={`group relative max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed break-words whitespace-pre-wrap ${
                        m.mine
                          ? "rounded-br-md bg-acid text-black"
                          : "rounded-bl-md border border-white/8 bg-white/[.05] text-zinc-100"
                      }`}
                    >
                      {m.body}
                      <span
                        className={`mt-1 flex items-center justify-end gap-1 font-mono text-[9.5px] ${
                          m.mine ? "text-black/55" : "text-zinc-600"
                        }`}
                      >
                        {fmtTime(m.createdAt)}
                        {m.mine &&
                          (m.readAt ? (
                            <CheckCheck size={12} className="text-black/70" />
                          ) : (
                            <Check size={12} className="text-black/45" />
                          ))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-white/8 bg-panel/60 p-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={`Transmit to ${info?.username ?? formatPhone(peer)}…`}
            className="max-h-36 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-acid/40 focus:bg-white/[.06]"
          />
          <button
            onClick={() => void send()}
            disabled={!draft.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acid text-black transition-all hover:shadow-[0_0_24px_rgba(200,245,66,.5)] active:scale-90 disabled:opacity-25 disabled:shadow-none"
          >
            <SendHorizonal size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
