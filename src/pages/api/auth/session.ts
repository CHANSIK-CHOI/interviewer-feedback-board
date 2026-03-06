import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerByAccessToken } from "@/lib/supabase/server";
import { getRequestAccessToken, RequestAccessTokenResult } from "@/lib/auth/request";
import { SessionCookieSyncResponse } from "@/types/response";

// 옵션: HttpOnly, SameSite=Lax, (prod에서 Secure), Path=/, Max-Age=3600
const ACCESS_TOKEN_COOKIE = "sb-access-token";

const buildCookie = (value: string, maxAge: number) =>
  [
    `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/", // 사이트 전체 경로에서 쿠키 사용
    "HttpOnly", // 브라우저 JS(document.cookie)에서 접근 불가 - XSS로 토큰 탈취되는 위험 감소
    "SameSite=Lax", // 외부 사이트에서 자동 전송 제한 (CSRF 완화)
    `Max-Age=${maxAge}`, // 쿠키 수명(초 단위) - 0이면 즉시 만료(삭제)
    process.env.NODE_ENV === "production" ? "Secure" : "", // 운영에서만 Secure 추가 (HTTPS에서만 전송)
  ]
    .filter(Boolean) // 빈 문자열 제거
    .join("; "); // 쿠키 표준 포맷으로 합침

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

  const {
    accessToken,
    error: tokenError,
    status: tokenStatus,
  }: RequestAccessTokenResult = getRequestAccessToken(req);
  if (tokenError || !accessToken) {
    return res
      .status(tokenStatus)
      .json({ data: null, error: tokenError ?? "Missing access token" });
  }

  const supabaseServer = getSupabaseServerByAccessToken(accessToken);
  if (!supabaseServer) {
    return res.status(500).json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
  }

  const { data, error } = await supabaseServer.auth.getUser();
  if (error || !data.user) {
    return res.status(401).json({ data: null, error: error?.message ?? "Unauthorized" });
  }

  // 1시간짜리 access token을 기준으로 짧게 유지하고, 갱신 시마다 다시 덮어쓴다.
  res.setHeader("Set-Cookie", buildCookie(accessToken, 60 * 60));
  return res.status(200).json({ data: { success: true }, error: null });
}
