import { asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { calls, callSignals } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function participantCall(mePhone: string, id: string) {
  const rows = await db.select().from(calls).where(eq(calls.id, Number(id) || 0)).limit(1);
  const call = rows[0];
  if (!call || (call.callerPhone !== mePhone && call.calleePhone !== mePhone)) return null;
  return call;
}

/** Push an ICE candidate. */
export async function POST(req: Request, ctx: Ctx) {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;

  const call = await participantCall(me.phone, id);
  if (!call) return err("Call not found.", 404);
  if (call.status !== "ringing" && call.status !== "ongoing")
    return err("Call is already over.", 409);

  const body = await req.json().catch(() => null);
  const payload = typeof body?.payload === "string" ? body.payload : null;
  if (!payload || payload.length > 4000) return err("Invalid signal payload.");

  await db.insert(callSignals).values({ callId: call.id, fromPhone: me.phone, payload });
  return ok({ ok: true });
}

/** Drain ICE candidates after a given cursor. */
export async function GET(req: Request, ctx: Ctx) {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;

  const call = await participantCall(me.phone, id);
  if (!call) return err("Call not found.", 404);

  const after = Number(new URL(req.url).searchParams.get("after") ?? "0") || 0;
  const rows = await db
    .select()
    .from(callSignals)
    .where(eq(callSignals.callId, call.id))
    .orderBy(asc(callSignals.id))
    .limit(400);

  return ok({ signals: rows.filter((s) => s.id > after) });
}
