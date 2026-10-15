import { count, gt } from "drizzle-orm";
import { db } from "@/db";
import { apiLogs, calls, messages, users } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { ok } from "@/lib/http";
import type { NetworkStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const onlineSince = new Date(Date.now() - 45_000);

  const [u, on, m, c, a] = await Promise.all([
    db.select({ v: count() }).from(users),
    db.select({ v: count() }).from(users).where(gt(users.lastSeenAt, onlineSince)),
    db.select({ v: count() }).from(messages),
    db.select({ v: count() }).from(calls),
    db.select({ v: count() }).from(apiLogs),
  ]);

  const stats: NetworkStats = {
    users: u[0]?.v ?? 0,
    online: on[0]?.v ?? 0,
    messages: m[0]?.v ?? 0,
    calls: c[0]?.v ?? 0,
    apiRequests: a[0]?.v ?? 0,
  };
  return ok(stats);
}
