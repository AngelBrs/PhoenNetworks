import { and, eq } from "drizzle-orm";
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
  const answer = typeof body?.answer === "string" ? body.answer : null;

  const rows = await db.select().from(calls).where(eq(calls.id, Number(id) || 0)).limit(1);
  const call = rows[0];
  if (!call) return err("Call not found.", 404);
  if (call.calleePhone !== me.phone) return err("Only the callee can answer.", 403);
  if (call.status !== "ringing") return err("This call is no longer ringing.", 409);

  const updated = await db
    .update(calls)
    .set({ status: "ongoing", answeredAt: new Date(), answer })
    .where(and(eq(calls.id, call.id), eq(calls.status, "ringing")))
    .returning();
  if (!updated[0]) return err("This call is no longer ringing.", 409);
  return ok({ call: updated[0] });
}
