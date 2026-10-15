import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

export const SESSION_COOKIE = "nexa_session";
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function makeApiKey(): string {
  return `nxk_${randomBytes(20).toString("hex")}`;
}

export function makeSessionToken(): string {
  return `nxs_${randomBytes(24).toString("hex")}`;
}

export async function createSessionFor(userId: number): Promise<string> {
  const token = makeSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch {
      /* no-op */
    }
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
    return null;
  }
  return row.user;
}

export async function requireUser(): Promise<User | Response> {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  return user;
}

export async function requireAdmin(): Promise<User | Response> {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!user.isAdmin)
    return Response.json({ error: "Admin access required" }, { status: 403 });
  return user;
}

export function publicUser(u: User) {
  return {
    id: u.id,
    phone: u.phone,
    username: u.username,
    isAdmin: u.isAdmin,
    isBot: u.isBot,
    hue: u.hue,
    createdAt: u.createdAt,
    lastSeenAt: u.lastSeenAt,
  };
}

export function mePayload(u: User) {
  return { ...publicUser(u), apiKey: u.apiKey };
}
