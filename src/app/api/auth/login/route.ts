import { eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { createSessionFor, mePayload, verifyPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureSeed();
  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid request body.");

  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");
  if (!identifier || !password) return err("Enter your username (or number) and password.");

  const phoneGuess = normalizePhone(identifier);
  const rows = await db
    .select()
    .from(users)
    .where(or(ilike(users.username, identifier), eq(users.phone, phoneGuess)))
    .limit(3);

  const user = rows.find(
    (u) =>
      u.username.toLowerCase() === identifier.toLowerCase() || u.phone === phoneGuess,
  );
  if (!user || !verifyPassword(password, user.passwordHash))
    return err("Wrong credentials. Check your username and password.", 401);

  await createSessionFor(user.id);
  return ok({ me: mePayload(user) });
}
