import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Mark everything from a peer as read. */
export async function POST(req: Request) {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const body = await req.json().catch(() => null);
  const peer = normalizePhone(String(body?.peer ?? ""));
  if (!peer) return ok({ ok: true });

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.toPhone, me.phone),
        eq(messages.fromPhone, peer),
        isNull(messages.readAt),
      ),
    );
  return ok({ ok: true });
}
