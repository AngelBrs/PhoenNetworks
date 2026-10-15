import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { generateNumbers } from "@/lib/phone";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Fresh batch of unclaimed numbers across +12 / +67 / +30. */
export async function GET(req: Request) {
  await ensureSeed();
  const url = new URL(req.url);
  const count = Math.min(Math.max(Number(url.searchParams.get("count") ?? "12") || 12, 1), 24);

  const rows = await db.select({ phone: users.phone }).from(users);
  const taken = new Set(rows.map((r) => r.phone));

  return ok({ numbers: generateNumbers(count, taken) });
}
