import { count, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { apiLogs, calls, messages, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const onlineSince = new Date(Date.now() - 45_000);
  const [u, on, m, c, a] = await Promise.all([
    db.select({ v: count() }).from(users),
    db.select({ v: count() }).from(users).where(gt(users.lastSeenAt, onlineSince)),
    db.select({ v: count() }).from(messages),
    db.select({ v: count() }).from(calls),
    db.select({ v: count() }).from(apiLogs),
  ]);

  const recentLogs = await db
    .select({
      id: apiLogs.id,
      endpoint: apiLogs.endpoint,
      status: apiLogs.status,
      createdAt: apiLogs.createdAt,
      phone: users.phone,
      username: users.username,
    })
    .from(apiLogs)
    .innerJoin(users, eq(users.id, apiLogs.userId))
    .orderBy(desc(apiLogs.id))
    .limit(30);

  return ok({
    stats: {
      users: u[0]?.v ?? 0,
      online: on[0]?.v ?? 0,
      messages: m[0]?.v ?? 0,
      calls: c[0]?.v ?? 0,
      apiRequests: a[0]?.v ?? 0,
    },
    apiLogs: recentLogs,
  });
}
