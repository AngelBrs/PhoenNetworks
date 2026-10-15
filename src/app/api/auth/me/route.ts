import { getSessionUser, mePayload } from "@/lib/auth";
import { ensureSeed } from "@/db/seed";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  return ok({ me: mePayload(user) });
}
