import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { calls, users } from "@/db/schema";
import { getApiUser, apiUnauthorized, logApi } from "@/lib/apiAuth";
import { isValidNexa, normalizePhone } from "@/lib/phone";
import { err, ok } from "@/lib/http";
import { sweepRingingFor } from "@/lib/call-utils";

export const dynamic = "force-dynamic";

/** Call history for your number. */
export async function GET(req: Request) {
  const me = await getApiUser(req);
  if (!me) return apiUnauthorized();

  await sweepRingingFor(me.phone);
  const rows = await db
    .select({
      id: calls.id,
      callerPhone: calls.callerPhone,
      calleePhone: calls.calleePhone,
      type: calls.type,
      status: calls.status,
      createdAt: calls.createdAt,
      answeredAt: calls.answeredAt,
      endedAt: calls.endedAt,
      endReason: calls.endReason,
    })
    .from(calls)
    .where(or(eq(calls.callerPhone, me.phone), eq(calls.calleePhone, me.phone)))
    .orderBy(desc(calls.id))
    .limit(100);

  await logApi(me.id, "GET /api/v1/calls", 200);
  return ok({ calls: rows });
}

/**
 * Place a call from your number: POST { to, type?: "audio" | "video" }.
 *
 * API-placed calls ring the recipient's NEXA app immediately. The API channel
 * carries signaling only — for two-way media, place the call from the web app
 * (WebRTC). API calls without a media channel end when answered.
 */
export async function POST(req: Request) {
  const me = await getApiUser(req);
  if (!me) return apiUnauthorized();

  const body = await req.json().catch(() => null);
  const to = normalizePhone(String(body?.to ?? ""));
  const type = body?.type === "video" ? "video" : "audio";

  if (!isValidNexa(to)) {
    await logApi(me.id, "POST /api/v1/calls", 400);
    return err("`to` must be a valid NEXA number (+12 / +67 / +30 + 7 digits).");
  }
  if (to === me.phone) {
    await logApi(me.id, "POST /api/v1/calls", 400);
    return err("You cannot call your own line.");
  }

  const target = await db.select().from(users).where(eq(users.phone, to)).limit(1);
  if (!target[0]) {
    await logApi(me.id, "POST /api/v1/calls", 404);
    return err("That number is not active on the NEXA network.", 404);
  }

  const inserted = await db
    .insert(calls)
    .values({ callerPhone: me.phone, calleePhone: to, type, offer: null })
    .returning();

  await logApi(me.id, "POST /api/v1/calls", 201);
  return ok(
    {
      call: {
        id: inserted[0].id,
        callerPhone: inserted[0].callerPhone,
        calleePhone: inserted[0].calleePhone,
        type: inserted[0].type,
        status: inserted[0].status,
        createdAt: inserted[0].createdAt,
      },
      note: "The recipient's NEXA app is now ringing. Poll GET /api/v1/calls/:id for status updates.",
    },
    201,
  );
}
