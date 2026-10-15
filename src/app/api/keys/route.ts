import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { makeApiKey, requireUser } from "@/lib/auth";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireUser();
  if (me instanceof Response) return me;
  return ok({ apiKey: me.apiKey });
}

/** Rotate the developer API key. */
export async function POST() {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const apiKey = makeApiKey();
  await db.update(users).set({ apiKey }).where(eq(users.id, me.id));
  return ok({ apiKey });
}
