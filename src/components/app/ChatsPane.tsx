"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus, MessagesSquare, Search } from "lucide-react";
import type { ChatSummary, Me } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Avatar, EmptyState } from "./ui";

export function ChatsPane({
  me,
  chats,
  activePeer,
  onOpen,
  onCompose,
}: {
  me: Me;
  chats: ChatSummary[];
  activePeer: string | null;
  onOpen: (peer: string) => void;
  onCompose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) => c.username.toLowerCase().includes(q) || c.peer.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\u0000"),
    );
  }, [chats, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">Messages</h1>
        <button
          onClick={onCompose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-acid text-black transition-all hover:shadow-[0_0_20px_rgba(200,245,66,.45)] active:scale-90"
          title="New message"
        >
          <MessageSquarePlus size={16} strokeWidth={2.4} />
        </button>
      </div>

      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[.03] px-3 py-2">
          <Search size={14} className="text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the wire…"
            className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Dead air"
            sub="No conversations yet. Hit compose or dial a number and say hello."
          />
        ) : (
          filtered.map((c) => {
            const active = c.peer === activePeer;
            return (
              <button
                key={c.peer}
                onClick={() => onOpen(c.peer)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                  active ? "bg-white/[.07]" : "hover:bg-white/[.04]"
                }`}
              >
                <Avatar name={c.username} hue={c.hue} size={44} online={c.online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-display text-[15px] font-semibold text-zinc-100">
                      {c.username}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-600">
                      {fmtDate(c.last.createdAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-[13px] ${c.unread > 0 ? "text-zinc-200" : "text-zinc-500"}`}
                    >
                      {c.last.mine && <span className="text-zinc-600">You: </span>}
                      {c.last.body}
                    </span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-acid px-1.5 font-mono text-[10px] font-bold text-black">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="hidden border-t border-white/5 px-5 py-3 lg:block">
        <span className="font-mono text-[10px] tracking-widest text-zinc-700 uppercase">
          {me.username} on the wire
        </span>
      </div>
    </div>
  );
}
