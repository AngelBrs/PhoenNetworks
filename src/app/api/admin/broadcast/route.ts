import { eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Push a message from the operator line to every subscriber. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text || text.length > 500) return err("Broadcast must be 1–500 characters.");

  const recipients = await db
    .select({ phone: users.phone })
    .from(users)
    .where(ne(users.id, admin.id));

  await db.insert(messages).values(
    recipients
      .filter((r) => r.phone !== admin.phone)
      .map((r) => ({ fromPhone: admin.phone, toPhone: r.phone, body: `⟨ NETWORK BROADCAST ⟩ ${text}` })),
  );

  return ok({ ok: true, delivered: recipients.length });
}
