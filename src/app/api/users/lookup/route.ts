import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isValidNexa, normalizePhone } from "@/lib/phone";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW = 45_000;

/** Does this number exist on the network? Public (needed by the dial pad). */
export async function GET(req: Request) {
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone") ?? "");
  if (!isValidNexa(phone)) return err("Not a valid NEXA number.");
  const rows = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  const u = rows[0];
  if (!u) return ok({ found: false, phone });
  return ok({
    found: true,
    phone: u.phone,
    username: u.username,
    hue: u.hue,
    isBot: u.isBot,
    online: Date.now() - u.lastSeenAt.getTime() < ONLINE_WINDOW,
  });
}
