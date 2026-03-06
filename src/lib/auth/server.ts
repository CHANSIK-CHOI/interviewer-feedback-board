import { getSupabaseServerByAccessToken } from "@/lib/supabase/server";
import type { SupabaseError } from "@/types/common";
import type { UserRole } from "@/types/user-role";
import { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthContext = {
  supabaseServer: SupabaseClient;
  userId: string;
  role: UserRole["role"] | null;
  isAdmin: boolean;
  authData: { user: User | null };
};

export type AuthContextResult = {
  context: AuthContext | null;
  error: string | null;
  status: number;
};

export const getAuthContextByAccessToken = async (
  accessToken: string
): Promise<AuthContextResult> => {
  const supabaseServer = getSupabaseServerByAccessToken(accessToken);
  if (!supabaseServer) {
    return {
      context: null,
      error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
      status: 500,
    };
  }

  const { data: authData, error: authError } = await supabaseServer.auth.getUser();
  if (authError || !authData.user) {
    return {
      context: null,
      error: authError?.message ?? "Unauthorized",
      status: 401,
    };
  }

  const {
    data: roleData,
    error: roleError,
  }: { data: { role: UserRole["role"] } | null; error: SupabaseError } = await supabaseServer
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (roleError) {
    return {
      context: null,
      error: roleError.message,
      status: 500,
    };
  }

  const role = roleData?.role ?? null;

  return {
    context: {
      supabaseServer,
      userId: authData.user.id,
      role,
      isAdmin: role === "admin",
      authData,
    },
    error: null,
    status: 200,
  };
};
