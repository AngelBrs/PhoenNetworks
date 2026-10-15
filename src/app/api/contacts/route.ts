import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contacts, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isValidNexa, normalizePhone } from "@/lib/phone";
import { err, ok } from "@/lib/http";
import type { ContactDto } from "@/lib/types";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW = 45_000;

export async function GET() {
  const me = await requireUser();
  if (me instanceof Response) return me;

  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.ownerId, me.id))
    .orderBy(desc(contacts.id));

  const phones = rows.map((r) => r.phone);
  const people = phones.length
    ? await db.select().from(users).where(inArray(users.phone, phones))
    : [];
  const map = new Map(people.map((u) => [u.phone, u]));

  const list: ContactDto[] = rows.map((r) => {
    const u = map.get(r.phone);
    return {
      id: r.id,
      phone: r.phone,
      name: r.name,
      exists: !!u,
      username: u?.username ?? null,
      hue: u?.hue ?? 220,
      online: u ? Date.now() - u.lastSeenAt.getTime() < ONLINE_WINDOW : false,
    };
  });
  return ok({ contacts: list });
}

export async function POST(req: Request) {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const body = await req.json().catch(() => null);
  const phone = normalizePhone(String(body?.phone ?? ""));
  const name = String(body?.name ?? "").trim();

  if (!isValidNexa(phone)) return err("Enter a valid NEXA number.");
  if (phone === me.phone) return err("That is your own line.");
  if (!name || name.length > 48) return err("Contact name must be 1–48 characters.");

  const target = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
  if (!target[0]) return err("That number is not active on the network.", 404);

  const existing = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.ownerId, me.id), eq(contacts.phone, phone)))
    .limit(1);

  if (existing[0]) {
    await db.update(contacts).set({ name }).where(eq(contacts.id, existing[0].id));
    return ok({ contact: { ...existing[0], name } });
  }
  const inserted = await db
    .insert(contacts)
    .values({ ownerId: me.id, phone, name })
    .returning();
  return ok({ contact: inserted[0] }, 201);
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  if (me instanceof Response) return me;
  const id = Number(new URL(req.url).searchParams.get("id") ?? "0");
  if (!id) return err("Missing contact id.");
  await db
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, me.id)));
  return ok({ ok: true });
}
