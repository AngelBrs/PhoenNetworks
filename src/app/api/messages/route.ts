import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isValidNexa, normalizePhone } from "@/lib/phone";
import { botReply } from "@/lib/bots";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Conversation history with a peer. */
export async function GET(req: Request) {
  const me = await requireUser();
  if (me instanceof Response) return me;

  const peer = normalizePhone(new URL(req.url).searchParams.get("peer") ?? "");
  if (!isValidNexa(peer)) return err("Missing or invalid peer number.");

  const rows = await db
    .select()
    .from(messages)
    .where(
      or(
        and(eq(messages.fromPhone, me.phone), eq(messages.toPhone, peer)),
        and(eq(messages.fromPhone, peer), eq(messages.toPhone, me.phone)),
      ),
    )
    .orderBy(desc(messages.id))
    .limit(200);

  return ok({
    messages: rows.reverse().map((m) => ({ ...m, mine: m.fromPhone === me.phone })),
  });
}

/** Send a message from your number. Bots auto-reply. */
export async function POST(req: Request) {
  const me = await requireUser();
  if (me instanceof Response) return me;

  const body = await req.json().catch(() => null);
  const to = normalizePhone(String(body?.to ?? ""));
  const text = String(body?.body ?? "").trim();

  if (!isValidNexa(to)) return err("Recipient must be a valid NEXA number.");
  if (to === me.phone) return err("You cannot message your own line.");
  if (!text || text.length > 2000) return err("Message must be 1–2000 characters.");

  const target = await db.select().from(users).where(eq(users.phone, to)).limit(1);
  if (!target[0]) return err("That number is not active on the network.", 404);

  const inserted = await db
    .insert(messages)
    .values({ fromPhone: me.phone, toPhone: to, body: text })
    .returning();

  // Network bots answer immediately so the wire always feels alive.
  if (target[0].isBot) {
    const reply = botReply(to, me.username, text);
    if (reply) {
      await db.insert(messages).values({ fromPhone: to, toPhone: me.phone, body: reply });
    }
  }

  return ok({ message: { ...inserted[0], mine: true } }, 201);
}
