import { desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ok } from "@/lib/http";
import type { ChatSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW = 45_000;

/** Thread list: one entry per peer, with last message + unread count. */
export async function GET() {
  const me = await requireUser();
  if (me instanceof Response) return me;

  const rows = await db
    .select()
    .from(messages)
    .where(or(eq(messages.fromPhone, me.phone), eq(messages.toPhone, me.phone)))
    .orderBy(desc(messages.id))
    .limit(800);

  const byPeer = new Map<string, (typeof rows)[number]>();
  const unread = new Map<string, number>();
  for (const m of rows) {
    const peer = m.fromPhone === me.phone ? m.toPhone : m.fromPhone;
    if (!byPeer.has(peer)) byPeer.set(peer, m);
    if (m.toPhone === me.phone && !m.readAt) unread.set(peer, (unread.get(peer) ?? 0) + 1);
  }

  const peers = [...byPeer.keys()];
  const people = peers.length
    ? await db.select().from(users).where(inArray(users.phone, peers))
    : [];
  const peopleMap = new Map(people.map((u) => [u.phone, u]));

  const chats: ChatSummary[] = peers.map((peer) => {
    const u = peopleMap.get(peer);
    const m = byPeer.get(peer)!;
    return {
      peer,
      username: u?.username ?? "Unknown line",
      hue: u?.hue ?? 220,
      isBot: u?.isBot ?? false,
      online: u ? Date.now() - u.lastSeenAt.getTime() < ONLINE_WINDOW : false,
      unread: unread.get(peer) ?? 0,
      last: {
        id: m.id,
        fromPhone: m.fromPhone,
        toPhone: m.toPhone,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt ? m.readAt.toISOString() : null,
        mine: m.fromPhone === me.phone,
      },
    };
  });

  return ok({ chats });
}
