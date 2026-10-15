import { eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { createSessionFor, hashPassword, makeApiKey, mePayload } from "@/lib/auth";
import { isValidNexa, normalizePhone } from "@/lib/phone";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[A-Za-z0-9._-]{3,20}$/;

export async function POST(req: Request) {
  await ensureSeed();
  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid request body.");

  const phone = normalizePhone(String(body.phone ?? ""));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!isValidNexa(phone))
    return err("Pick one of the generated numbers — it must start with +12, +67 or +30.");
  if (!USERNAME_RE.test(username))
    return err("Username must be 3–20 characters: letters, numbers, dot, dash, underscore.");
  if (password.length < 4 || password.length > 64)
    return err("Password must be between 4 and 64 characters.");

  const phoneTaken = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  if (phoneTaken.length) return err("That number is already claimed on the network.", 409);

  const nameTaken = await db
    .select({ id: users.id })
    .from(users)
    .where(ilike(users.username, username))
    .limit(1);
  if (nameTaken.length) return err("That username is taken by another line.", 409);

  const inserted = await db
    .insert(users)
    .values({
      phone,
      username,
      passwordHash: hashPassword(password),
      apiKey: makeApiKey(),
      hue: Math.floor(Math.random() * 360),
    })
    .returning();

  const user = inserted[0];
  await createSessionFor(user.id);
  return ok({ me: mePayload(user) }, 201);
}
