import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW = 45_000;

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const rows = await db.select().from(users).orderBy(asc(users.id));
  return ok({
    users: rows.map((u) => ({
      id: u.id,
      phone: u.phone,
      username: u.username,
      isAdmin: u.isAdmin,
      isBot: u.isBot,
      hue: u.hue,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
      online: Date.now() - u.lastSeenAt.getTime() < ONLINE_WINDOW,
      apiKeyPreview: `${u.apiKey.slice(0, 10)}…`,
    })),
  });
}
