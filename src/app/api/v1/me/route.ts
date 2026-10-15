import { getApiUser, apiUnauthorized, logApi } from "@/lib/apiAuth";
import { formatPhone } from "@/lib/phone";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const me = await getApiUser(req);
  if (!me) return apiUnauthorized();
  await logApi(me.id, "GET /api/v1/me", 200);
  return ok({
    phone: me.phone,
    formatted: formatPhone(me.phone),
    username: me.username,
    createdAt: me.createdAt,
  });
}
