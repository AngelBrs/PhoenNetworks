import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calls } from "@/db/schema";
import { getApiUser, apiUnauthorized, logApi } from "@/lib/apiAuth";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const me = await getApiUser(req);
  if (!me) return apiUnauthorized();
  const { id } = await ctx.params;

  const rows = await db.select().from(calls).where(eq(calls.id, Number(id) || 0)).limit(1);
  const call = rows[0];
  if (!call || (call.callerPhone !== me.phone && call.calleePhone !== me.phone)) {
    await logApi(me.id, `GET /api/v1/calls/${id}`, 404);
    return err("Call not found for your number.", 404);
  }

  await logApi(me.id, `GET /api/v1/calls/${id}`, 200);
  return ok({
    call: {
      id: call.id,
      callerPhone: call.callerPhone,
      calleePhone: call.calleePhone,
      type: call.type,
      status: call.status,
      createdAt: call.createdAt,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
      endReason: call.endReason,
    },
  });
}

/** POST { action: "hangup" } */
export async function POST(req: Request, ctx: Ctx) {
  const me = await getApiUser(req);
  if (!me) return apiUnauthorized();
  const { id } = await ctx.params;

  const rows = await db.select().from(calls).where(eq(calls.id, Number(id) || 0)).limit(1);
  const call = rows[0];
  if (!call || (call.callerPhone !== me.phone && call.calleePhone !== me.phone)) {
    await logApi(me.id, `POST /api/v1/calls/${id}`, 404);
    return err("Call not found for your number.", 404);
  }

  const body = await req.json().catch(() => null);
  if (body?.action !== "hangup") return err('Supported action: "hangup".');
  if (call.status !== "ringing" && call.status !== "ongoing") return ok({ call });

  const status = call.status === "ringing" ? "missed" : "ended";
  const updated = await db
    .update(calls)
    .set({ status, endedAt: new Date(), endReason: "hangup (api)" })
    .where(eq(calls.id, call.id))
    .returning();

  await logApi(me.id, `POST /api/v1/calls/${id}`, 200);
  return ok({ ok: true, status: updated[0].status });
}
