"use client";

import { useState } from "react";
import { MessageSquare, Phone, Trash2, UserPlus, Users, Video } from "lucide-react";
import * as api from "@/lib/client-api";
import type { ContactDto, Me } from "@/lib/types";
import { formatPhone, isCompleteNexa } from "@/lib/phone";
import { usePoll } from "@/lib/use-poll";
import { Avatar, EmptyState, IconBtn, Spinner, toast } from "./ui";

export function ContactsPane({
  me,
  onCall,
  onMessage,
}: {
  me: Me;
  onCall: (peer: string, type: "audio" | "video") => void;
  onMessage: (peer: string) => void;
}) {
  const [contacts, setContacts] = useState<ContactDto[] | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setContacts(await api.getContacts());
    } catch {
      /* ignore */
    }
  };
  usePoll(refresh, 5000);

  const valid = isCompleteNexa(phone);

  const submit = async () => {
    if (!valid || !name.trim() || busy) return;
    setBusy(true);
    try {
      await api.addContact(phone, name.trim());
      toast(`Saved ${name.trim()} to your directory`, "ok");
      setPhone("");
      setName("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save contact", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">Directory</h1>
      </div>

      {/* add form */}
      <div className="mx-4 mb-3 rounded-2xl border border-white/8 bg-white/[.03] p-3">
        <div className="flex items-center gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+12 000 0000"
            className="w-[46%] rounded-xl border border-white/10 bg-void/60 px-3 py-2.5 font-mono text-sm tracking-wider text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-acid/40"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder="Contact name"
            className="flex-1 rounded-xl border border-white/10 bg-void/60 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-acid/40"
          />
          <button
            onClick={() => void submit()}
            disabled={!valid || !name.trim() || busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-acid text-black transition-all active:scale-90 disabled:opacity-25"
            title="Save contact"
          >
            {busy ? <Spinner size={15} /> : <UserPlus size={16} strokeWidth={2.4} />}
          </button>
        </div>
        {phone && !valid && (
          <p className="mt-2 font-mono text-[10px] tracking-wider text-zinc-600">
            full number required: +12/+67/+30 + 7 digits
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        {contacts === null ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={22} />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Empty directory"
            sub="Save the numbers you dial the most. They'll live one tap away."
          />
        ) : (
          contacts.map((c) => (
            <div
              key={c.id}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[.04]"
            >
              <Avatar name={c.name} hue={c.hue} size={42} online={c.exists ? c.online : undefined} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-semibold text-zinc-100">
                  {c.name}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-500">
                  {formatPhone(c.phone)}
                  {c.username && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="truncate text-zinc-600">{c.username}</span>
                    </>
                  )}
                  {!c.exists && <span className="text-red-400/80">· off network</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconBtn icon={MessageSquare} label="Message" onClick={() => onMessage(c.phone)} />
                <IconBtn icon={Phone} label="Call" onClick={() => onCall(c.phone, "audio")} />
                <span className="hidden group-hover:inline-flex">
                  <IconBtn icon={Video} label="Video" onClick={() => onCall(c.phone, "video")} />
                </span>
                <IconBtn
                  icon={Trash2}
                  label="Remove"
                  danger
                  onClick={() => {
                    void api.deleteContact(c.id).then(refresh).catch(() => {});
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
