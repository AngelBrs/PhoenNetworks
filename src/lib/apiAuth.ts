import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiLogs, users, type User } from "@/db/schema";

/** Developer API auth — accepts `Authorization: Bearer <key>` or `x-api-key`. */
export async function getApiUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization") ?? "";
  let key = "";
  if (auth.toLowerCase().startsWith("bearer ")) key = auth.slice(7).trim();
  if (!key) key = (req.headers.get("x-api-key") ?? "").trim();
  if (!key) return null;
  const rows = await db.select().from(users).where(eq(users.apiKey, key)).limit(1);
  return rows[0] ?? null;
}

export async function logApi(userId: number, endpoint: string, status: number) {
  try {
    await db.insert(apiLogs).values({ userId, endpoint, status });
  } catch {
    /* logging must never break requests */
  }
}

export const apiUnauthorized = () =>
  Response.json(
    {
      error: "invalid_api_key",
      message:
        "Provide a valid developer API key via `Authorization: Bearer <key>`. " +
        "Get your key from the NEXA app → Settings → Developer API.",
    },
    { status: 401 },
  );
