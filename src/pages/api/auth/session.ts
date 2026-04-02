import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerUserClient } from "@/lib/supabase/server";
import { SessionCookieSyncResponse } from "@/types/response";

const ACCESS_TOKEN_COOKIE = "sb-access-token";

const buildCookie = (value: string, maxAge: number) =>
  [
    `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionCookieSyncResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", buildCookie("", 0));
    return res.status(200).json({ data: null, error: null });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) {
    return res.status(401).json({ data: null, error: "Missing access token" });
  }

  const supabaseServerUserClient = createSupabaseServerUserClient(accessToken);
  if (!supabaseServerUserClient) {
    return res.status(500).json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
  }

  const { data, error } = await supabaseServerUserClient.auth.getUser();
  if (error || !data.user) {
    return res.status(401).json({ data: null, error: error?.message ?? "Unauthorized" });
  }

  res.setHeader("Set-Cookie", buildCookie(accessToken, 60 * 60));
  return res.status(200).json({ data: { success: true }, error: null });
}
