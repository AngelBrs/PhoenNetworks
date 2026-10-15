import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { getApiUser, apiUnauthorized, logApi } from "@/lib/apiAuth";
import { isValidNexa, normalizePhone } from "@/lib/phone";
import { botReply } from "@/lib/bots";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** List a conversation: GET /api/v1/messages?peer=+67...&limit=50 */
export async function GET(req: Request) {
  const me = await getApiUser(req);
  if (!me) return apiUnauthorized();

  const url = new URL(req.url);
  const peer = normalizePhone(url.searchParams.get("peer") ?? "");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50") || 50, 1), 200);
  if (!isValidNexa(peer)) {
    await logApi(me.id, "GET /api/v1/messages", 400);
    return err("Query param `peer` must be a valid NEXA number.");
  }

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
    .limit(limit);

  await logApi(me.id, "GET /api/v1/messages", 200);
  return ok({ messages: rows.reverse() });
}

/** Send a message from your number: POST { to, body } */
export async function POST(req: Request) {
  const me = await getApiUser(req);
  if (!me) return apiUnauthorized();

  const body = await req.json().catch(() => null);
  const to = normalizePhone(String(body?.to ?? ""));
  const text = String(body?.body ?? "").trim();

  if (!isValidNexa(to)) {
    await logApi(me.id, "POST /api/v1/messages", 400);
    return err("`to` must be a valid NEXA number (+12 / +67 / +30 + 7 digits).");
  }
  if (to === me.phone) {
    await logApi(me.id, "POST /api/v1/messages", 400);
    return err("You cannot message your own line.");
  }
  if (!text || text.length > 2000) {
    await logApi(me.id, "POST /api/v1/messages", 400);
    return err("`body` must be 1–2000 characters.");
  }

  const target = await db.select().from(users).where(eq(users.phone, to)).limit(1);
  if (!target[0]) {
    await logApi(me.id, "POST /api/v1/messages", 404);
    return err("That number is not active on the NEXA network.", 404);
  }

  const inserted = await db
    .insert(messages)
    .values({ fromPhone: me.phone, toPhone: to, body: text })
    .returning();

  if (target[0].isBot) {
    const reply = botReply(to, me.username, text);
    if (reply) {
      await db.insert(messages).values({ fromPhone: to, toPhone: me.phone, body: reply });
    }
  }

  await logApi(me.id, "POST /api/v1/messages", 201);
  return ok({ message: inserted[0] }, 201);
}
