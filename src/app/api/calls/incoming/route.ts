import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { calls, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ok } from "@/lib/http";
import { sweepRingingFor } from "@/lib/call-utils";

export const dynamic = "force-dynamic";

/** Current ringing call addressed to my line (if any). */
export async function GET() {
  const me = await requireUser();
  if (me instanceof Response) return me;

  await sweepRingingFor(me.phone);

  const rows = await db
    .select()
    .from(calls)
    .where(eq(calls.calleePhone, me.phone))
    .orderBy(desc(calls.id))
    .limit(10);

  const ringing = rows.find((c) => c.status === "ringing") ?? null;
  if (!ringing) return ok({ call: null });

  const caller = await db
    .select()
    .from(users)
    .where(eq(users.phone, ringing.callerPhone))
    .limit(1);

  return ok({
    call: ringing,
    caller: caller[0]
      ? { phone: caller[0].phone, username: caller[0].username, hue: caller[0].hue }
      : null,
  });
}
