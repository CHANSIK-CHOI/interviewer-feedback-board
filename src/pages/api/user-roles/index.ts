import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { SupabaseError } from "@/types/common";
import type { UserRole } from "@/types/user-role";
import { getRequestAccessToken, RequestAccessTokenResult } from "@/lib/auth/request";
import { UserRoleSyncResponse } from "@/types/response";

// POST: role 없으면 reviewer로 생성(201), 있으면 기존 role 반환(200)
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserRoleSyncResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const {
    accessToken,
    error: tokenError,
    status: tokenStatus,
  }: RequestAccessTokenResult = getRequestAccessToken(req);

  if (tokenError || !accessToken) {
    return res.status(tokenStatus).json({ data: null, error: tokenError });
  }

  try {
    const { data: authData, error: authError } = await supabaseServer.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return res.status(401).json({ data: null, error: authError?.message ?? "Unauthorized" });
    }

    // insert() 우선 시도: 성공 시 신규(201), unique 충돌 시 기존 사용자(200)로 처리
    const {
      data: insertedRows,
      error: insertError,
    }: { data: UserRole[] | null; error: SupabaseError } = await supabaseServer
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "reviewer",
      })
      .select();

    if (!insertError && insertedRows && insertedRows[0]?.role) {
      return res.status(201).json({
        data: {
          role: insertedRows[0].role,
          isNewUser: true,
        },
        error: null,
      });
    }

    // 동시 요청 등으로 unique 충돌이 나면 기존 role 조회
    if (insertError?.code !== "23505") {
      return res.status(500).json({ data: null, error: insertError?.message ?? "Insert failed" });
    }

    const {
      data: existingRole,
      error: existingError,
    }: { data: { role: UserRole["role"] } | null; error: SupabaseError } = await supabaseServer
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .limit(1) // 조회 결과 row 개수를 최대 1개로 제한
      .maybeSingle(); // 0개면 null, 1개면 객체로 전달 받음

    if (existingError) {
      return res
        .status(500)
        .json({ data: null, error: existingError?.message ?? "Select failed Existing Role" });
    }

    if (!existingRole?.role) {
      return res.status(500).json({ data: null, error: "Role sync failed" });
    }

    return res.status(200).json({
      data: {
        role: existingRole.role,
        isNewUser: false,
      },
      error: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
