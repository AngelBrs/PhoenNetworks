import { desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { calls, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { sweepRingingFor } from "@/lib/call-utils";
import { isValidNexa, normalizePhone } from "@/lib/phone";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Call history for the signed-in line. */
export async function GET() {
  const me = await requireUser();
  if (me instanceof Response) return me;

  await sweepRingingFor(me.phone);

  const rows = await db
    .select()
    .from(calls)
    .where(or(eq(calls.callerPhone, me.phone), eq(calls.calleePhone, me.phone)))
    .orderBy(desc(calls.id))
    .limit(100);

  const peers = [...new Set(rows.map((c) => (c.callerPhone === me.phone ? c.calleePhone : c.callerPhone)))];
  const people = peers.length
    ? await db.select().from(users).where(inArray(users.phone, peers))
    : [];
  const names: Record<string, { username: string; hue: number }> = {};
  for (const u of people) names[u.phone] = { username: u.username, hue: u.hue };

  return ok({
    calls: rows.map((c) => ({
      ...c,
      offer: undefined,
      answer: undefined,
      direction: c.callerPhone === me.phone ? "outgoing" : "incoming",
      peer: c.callerPhone === me.phone ? c.calleePhone : c.callerPhone,
      viaApi: !c.offer,
    })),
    names,
  });
}

/** Place a call (WebRTC calls carry an SDP offer; API calls don't). */
export async function POST(req: Request) {
  const me = await requireUser();
  if (me instanceof Response) return me;

  const body = await req.json().catch(() => null);
  const to = normalizePhone(String(body?.to ?? ""));
  const type = body?.type === "video" ? "video" : "audio";
  const offer = typeof body?.offer === "string" ? body.offer : null;

  if (!isValidNexa(to)) return err("Dial a valid NEXA number (+12 / +67 / +30).");
  if (to === me.phone) return err("You cannot call your own line.");

  const target = await db.select().from(users).where(eq(users.phone, to)).limit(1);
  if (!target[0]) return err("That number is not active on the network.", 404);

  await sweepRingingFor(me.phone);

  const inserted = await db
    .insert(calls)
    .values({ callerPhone: me.phone, calleePhone: to, type, offer })
    .returning();
  return ok({ call: inserted[0] }, 201);
}
