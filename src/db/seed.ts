import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, makeApiKey } from "@/lib/auth";

export const ADMIN_PHONE = "+120000001";
export const ADMIN_USERNAME = "Angelbrs12";
export const GUIDE_PHONE = "+300000000";
export const ECHO_PHONE = "+675550142";

let seeded = false;

/**
 * Idempotent bootstrap: creates the admin account (Angelbrs12 / 5121) and the
 * two network bots on first use. Safe to call from any route.
 */
export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, ADMIN_USERNAME))
      .limit(1);
    if (existing.length) return;

    const mk = (
      phone: string,
      username: string,
      password: string,
      isAdmin: boolean,
      isBot: boolean,
      hue: number,
    ) => ({
      phone,
      username,
      passwordHash: hashPassword(password),
      isAdmin,
      isBot,
      apiKey: makeApiKey(),
      hue,
    });

    await db.insert(users).values([
      mk(ADMIN_PHONE, ADMIN_USERNAME, "5121", true, false, 78),
      mk(GUIDE_PHONE, "NEXA Guide", randomBytes(12).toString("hex"), false, true, 190),
      mk(ECHO_PHONE, "Echo Bot", randomBytes(12).toString("hex"), false, true, 300),
    ]);
  } catch {
    seeded = false; // retry next time (e.g. schema not pushed yet)
  }
}
