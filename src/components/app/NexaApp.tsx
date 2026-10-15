"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Hash,
  MessagesSquare,
  PhoneCall,
  Radio,
  Settings,
  Users,
  X,
} from "lucide-react";
import * as api from "@/lib/client-api";
import type { CallDto, ChatSummary, Me, PeerInfo } from "@/lib/types";
import { messagePop, startRingtone } from "@/lib/sounds";
import { formatPhone, isCompleteNexa } from "@/lib/phone";
import { usePoll } from "@/lib/use-poll";
import { Avatar, EmptyState, Spinner, Toaster } from "./ui";
import { ChatsPane } from "./ChatsPane";
import { ChatThread } from "./ChatThread";
import { CallsPane } from "./CallsPane";
import { ContactsPane } from "./ContactsPane";
import { Dialpad } from "./Dialpad";
import { SettingsPane } from "./SettingsPane";
import { CallOverlay, IncomingCallSheet } from "./CallOverlay";

type Tab = "chats" | "calls" | "contacts" | "dial" | "settings";

const TABS: { id: Tab; label: string; icon: typeof MessagesSquare }[] = [
  { id: "chats", label: "Chats", icon: MessagesSquare },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "contacts", label: "Directory", icon: Users },
  { id: "dial", label: "Dial", icon: Hash },
  { id: "settings", label: "Settings", icon: Settings },
];

export function NexaApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>("chats");
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);

  const [outgoing, setOutgoing] = useState<{ peer: string; type: "audio" | "video" } | null>(null);
  const [answering, setAnswering] = useState<CallDto | null>(null);
  const [incoming, setIncoming] = useState<{
    call: CallDto;
    caller: { phone: string; username: string; hue: number } | null;
  } | null>(null);

  const prevUnread = useRef(0);

  // ── boot ───────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .getMe()
      .then((m) => {
        setMe(m);
        setBooting(false);
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  // ── presence heartbeat ─────────────────────────────────────────────
  usePoll(
    async () => {
      await api.beat().catch(() => {});
    },
    me ? 12_000 : null,
    [me?.phone],
  );

  // ── chat list + unread pops ────────────────────────────────────────
  usePoll(
    async () => {
      try {
        const list = await api.getChats();
        setChats(list);
        const unread = list.reduce((a, c) => a + (c.peer === activePeer ? 0 : c.unread), 0);
        if (unread > prevUnread.current) messagePop();
        prevUnread.current = unread;
      } catch {
        /* session may have expired */
      }
    },
    me ? 3500 : null,
    [me?.phone, activePeer],
  );

  // ── incoming calls ─────────────────────────────────────────────────
  usePoll(
    async () => {
      if (answering || outgoing) {
        setIncoming(null);
        return;
      }
      try {
        const r = await api.incomingCall();
        if (r.call) {
          setIncoming({ call: r.call, caller: r.caller });
        } else {
          setIncoming(null);
        }
      } catch {
        /* ignore */
      }
    },
    me ? 1600 : null,
    [me?.phone, answering, outgoing],
  );

  // ringtone lifecycle
  useEffect(() => {
    if (!incoming || answering) return;
    const stop = startRingtone();
    return stop;
  }, [incoming, answering]);

  const startCall = useCallback((peer: string, type: "audio" | "video") => {
    setOutgoing({ peer, type });
  }, []);

  const openChat = useCallback((peer: string) => {
    setTab("chats");
    setActivePeer(peer);
  }, []);

  const doLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* proceed anyway */
    }
    window.location.href = "/";
  };

  if (booting || !me) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-void">
        <BrandMark size={52} />
        <div className="flex items-center gap-2 font-mono text-xs tracking-[.3em] text-zinc-600 uppercase">
          <Spinner size={13} /> connecting to the grid
        </div>
      </div>
    );
  }

  const unreadTotal = chats.reduce((a, c) => a + (c.peer === activePeer ? 0 : c.unread), 0);

  const listPane = (
    <>
      {tab === "chats" && (
        <ChatsPane
          me={me}
          chats={chats}
          activePeer={activePeer}
          onOpen={openChat}
          onCompose={() => setComposeOpen(true)}
        />
      )}
      {tab === "calls" && <CallsPane me={me} onCall={startCall} onMessage={openChat} />}
      {tab === "contacts" && <ContactsPane me={me} onCall={startCall} onMessage={openChat} />}
      {tab === "settings" && <SettingsPane me={me} onLogout={() => void doLogout()} />}
    </>
  );

  const detailPane =
    tab === "chats" && activePeer ? (
      <ChatThread
        key={activePeer}
        me={me}
        peer={activePeer}
        onBack={() => setActivePeer(null)}
        onCall={startCall}
      />
    ) : (
      <EmptyState
        icon={Radio}
        title="NEXA command deck"
        sub="Pick a channel on the left — or hit the dial pad and put a number on the wire."
      />
    );

  const mobileThreadOpen = tab === "chats" && activePeer !== null;

  return (
    <div className="flex h-dvh overflow-hidden bg-void text-zinc-100">
      <Toaster />

      {/* desktop rail */}
      <nav className="hidden w-[78px] shrink-0 flex-col items-center gap-1.5 border-r border-white/8 bg-panel/40 py-5 lg:flex">
        <BrandMark size={40} className="mb-4" />
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "chats") setActivePeer(null);
              }}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all active:scale-90 ${
                active ? "bg-acid text-black" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              }`}
              title={t.label}
            >
              <t.icon size={20} strokeWidth={active ? 2.4 : 2} />
              {t.id === "chats" && unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyanx px-1 font-mono text-[10px] font-bold text-black">
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </span>
              )}
            </button>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-2">
          <Avatar name={me.username} hue={me.hue} size={38} online />
        </div>
      </nav>

      {/* main columns */}
      {tab === "dial" ? (
        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <Dialpad me={me} onCall={startCall} onMessage={openChat} />
        </main>
      ) : (
        <>
          <section
            className={`min-w-0 flex-col border-r border-white/8 bg-panel/25 pb-16 lg:flex lg:w-[380px] lg:shrink-0 lg:pb-0 ${
              mobileThreadOpen ? "hidden" : "flex w-full"
            }`}
          >
            {listPane}
          </section>
          <section
            className={`min-w-0 flex-1 lg:flex ${mobileThreadOpen ? "flex w-full" : "hidden lg:flex"}`}
          >
            {detailPane}
          </section>
        </>
      )}

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-white/8 bg-panel/95 backdrop-blur-xl lg:hidden">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "chats") setActivePeer(null);
              }}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? "text-acid" : "text-zinc-500"
              }`}
            >
              <t.icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="font-mono text-[9px] tracking-widest uppercase">{t.label.slice(0, 5)}</span>
              {t.id === "chats" && unreadTotal > 0 && (
                <span className="absolute top-1 right-[calc(50%-22px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-cyanx px-1 font-mono text-[9px] font-bold text-black">
                  {unreadTotal > 99 ? "99" : unreadTotal}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* compose modal */}
      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} onOpen={openChat} />}

      {/* incoming call sheet */}
      {incoming && !answering && (
        <IncomingCallSheet
          call={incoming.call}
          caller={incoming.caller}
          onAccept={() => {
            setAnswering(incoming.call);
            setIncoming(null);
          }}
          onDecline={() => {
            void api.declineCall(incoming.call.id).catch(() => {});
            setIncoming(null);
          }}
        />
      )}

      {/* active calls */}
      {outgoing && (
        <CallOverlay
          me={me}
          mode="outgoing"
          peer={outgoing.peer}
          type={outgoing.type}
          onClose={() => setOutgoing(null)}
        />
      )}
      {answering && (
        <CallOverlay
          me={me}
          mode="incoming"
          peer={answering.callerPhone}
          type={answering.type as "audio" | "video"}
          incomingCall={answering}
          onClose={() => setAnswering(null)}
        />
      )}
    </div>
  );
}

// ── Compose (new message) modal ────────────────────────────────────────
function ComposeModal({ onClose, onOpen }: { onClose: () => void; onOpen: (peer: string) => void }) {
  const [phone, setPhone] = useState("");
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const valid = isCompleteNexa(phone);

  useEffect(() => {
    setPeer(null);
    if (!valid) return;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.lookup(phone);
        if (r.found) {
          setPeer({
            phone: r.phone!,
            username: r.username!,
            hue: r.hue!,
            isBot: !!r.isBot,
            online: !!r.online,
          });
        }
      } catch {
        /* ignore */
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [phone, valid]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-void/70 px-4 pt-24 backdrop-blur-sm animate-[fade-in_.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-panel p-5 shadow-2xl animate-[slide-down_.3s_cubic-bezier(.21,1.02,.73,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white">New transmission</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X size={17} />
          </button>
        </div>
        <input
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+67 555 0142"
          className="mt-4 w-full rounded-2xl border border-white/10 bg-void/70 px-4 py-3.5 font-mono text-lg tracking-[.12em] text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-acid/40"
        />
        <div className="mt-3 min-h-[44px]">
          {checking && (
            <span className="flex items-center gap-2 font-mono text-xs text-zinc-500">
              <Spinner size={13} /> probing…
            </span>
          )}
          {!checking && peer && (
            <div className="flex items-center gap-3 rounded-2xl border border-acid/20 bg-acid/[.06] p-3">
              <Avatar name={peer.username} hue={peer.hue} size={34} online={peer.online} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm font-semibold text-white">{peer.username}</div>
                <div className="font-mono text-[11px] text-zinc-500">{formatPhone(peer.phone)}</div>
              </div>
              <button
                onClick={() => {
                  onOpen(peer.phone);
                  onClose();
                }}
                className="rounded-xl bg-acid px-4 py-2 font-display text-sm font-bold text-black transition-transform active:scale-95"
              >
                Open
              </button>
            </div>
          )}
          {!checking && valid && !peer && (
            <span className="font-mono text-xs text-red-400/90">number not on this network</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-acid font-display font-black text-black shadow-[0_0_38px_rgba(200,245,66,.35)] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.52 }}
    >
      N
    </div>
  );
}
