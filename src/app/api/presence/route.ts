import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW = 45_000;

/** Heartbeat — keeps your line green. */
export async function POST() {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, me.id));
  return ok({ ok: true, at: new Date().toISOString() });
}

/** Batch presence lookup: GET /api/presence?phones=+12...,+67... */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("phones") ?? "";
  const phones = raw
    .split(",")
    .map((p) => normalizePhone(p))
    .filter(Boolean)
    .slice(0, 100);
  if (!phones.length) return ok({ presence: {} });

  const rows = await db.select().from(users).where(inArray(users.phone, phones));
  const presence: Record<string, { online: boolean; lastSeenAt: string }> = {};
  for (const u of rows) {
    presence[u.phone] = {
      online: Date.now() - u.lastSeenAt.getTime() < ONLINE_WINDOW,
      lastSeenAt: u.lastSeenAt.toISOString(),
    };
  }
  return ok({ presence });
}
