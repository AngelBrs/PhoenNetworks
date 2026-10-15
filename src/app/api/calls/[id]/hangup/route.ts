import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calls } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 48) : "hangup";

  const rows = await db.select().from(calls).where(eq(calls.id, Number(id) || 0)).limit(1);
  const call = rows[0];
  if (!call) return err("Call not found.", 404);
  if (call.callerPhone !== me.phone && call.calleePhone !== me.phone)
    return err("Not your call.", 403);
  if (call.status !== "ringing" && call.status !== "ongoing") return ok({ call });

  // Ending while still ringing = a missed call for the other side.
  const status = call.status === "ringing" ? "missed" : "ended";
  const updated = await db
    .update(calls)
    .set({ status, endedAt: new Date(), endReason: reason })
    .where(eq(calls.id, call.id))
    .returning();
  return ok({ call: updated[0] });
}
