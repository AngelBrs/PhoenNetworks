import { and, eq, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { calls } from "@/db/schema";

export const RING_TTL_MS = 45_000;

/** Expire stale ringing calls touching this line so they become missed calls. */
export async function sweepRingingFor(phone: string) {
  const cutoff = new Date(Date.now() - RING_TTL_MS);
  await db
    .update(calls)
    .set({ status: "missed", endedAt: new Date(), endReason: "no-answer" })
    .where(
      and(
        eq(calls.status, "ringing"),
        lt(calls.createdAt, cutoff),
        or(eq(calls.callerPhone, phone), eq(calls.calleePhone, phone)),
      ),
    );
}
