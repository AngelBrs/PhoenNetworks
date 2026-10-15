import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { err, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const PROTECTED = "Angelbrs12";

/** Admin actions: resetPassword, toggleAdmin. */
export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await ctx.params;

  const rows = await db.select().from(users).where(eq(users.id, Number(id) || 0)).limit(1);
  const target = rows[0];
  if (!target) return err("User not found.", 404);

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");

  if (action === "resetPassword") {
    const password = String(body?.password ?? "");
    if (password.length < 4 || password.length > 64)
      return err("Password must be 4–64 characters.");
    await db
      .update(users)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(users.id, target.id));
    await db.delete(sessions).where(eq(sessions.userId, target.id)); // force re-login
    return ok({ ok: true, message: `Password reset for ${target.username}.` });
  }

  if (action === "toggleAdmin") {
    if (target.username === PROTECTED) return err("The operator account cannot be demoted.");
    await db.update(users).set({ isAdmin: !target.isAdmin }).where(eq(users.id, target.id));
    return ok({ ok: true, isAdmin: !target.isAdmin });
  }

  return err("Unknown admin action.");
}

/** Release a number back into the wild. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await ctx.params;

  const rows = await db.select().from(users).where(eq(users.id, Number(id) || 0)).limit(1);
  const target = rows[0];
  if (!target) return err("User not found.", 404);
  if (target.id === admin.id) return err("You cannot delete your own line.");
  if (target.username === PROTECTED) return err("The operator account is protected.");

  await db.delete(users).where(eq(users.id, target.id));
  return ok({ ok: true, released: target.phone });
}
