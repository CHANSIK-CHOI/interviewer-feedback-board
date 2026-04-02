import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import type { SupabaseError } from "@/types/common";
import type { UserRole } from "@/types/user-role";
import { UserRoleSyncResponse } from "@/types/response";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserRoleSyncResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) {
    return res.status(401).json({ data: null, error: "Missing access token" });
  }

  try {
    const { data: authData, error: authError } =
      await supabaseServerAdminClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return res.status(401).json({ data: null, error: authError?.message ?? "Unauthorized" });
    }

    const {
      data: insertedRows,
      error: insertError,
    }: { data: UserRole[] | null; error: SupabaseError } = await supabaseServerAdminClient
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

    if (insertError?.code !== "23505") {
      return res.status(500).json({ data: null, error: insertError?.message ?? "Insert failed" });
    }

    const {
      data: existingRole,
      error: existingError,
    }: { data: { role: UserRole["role"] } | null; error: SupabaseError } =
      await supabaseServerAdminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .limit(1)
        .maybeSingle();

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
