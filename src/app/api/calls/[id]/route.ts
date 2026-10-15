import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calls } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Live call state — polled by both parties during setup and the call itself. */
export async function GET(_req: Request, ctx: Ctx) {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;

  const rows = await db.select().from(calls).where(eq(calls.id, Number(id) || 0)).limit(1);
  const call = rows[0];
  if (!call || (call.callerPhone !== me.phone && call.calleePhone !== me.phone))
    return err("Call not found.", 404);

  return ok({ call });
}
