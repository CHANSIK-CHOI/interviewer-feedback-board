import { getSupabaseServer } from "@/lib/supabase/server";
import { getUserName } from "@/lib/user/profile";

export const getAuthUserNameById = async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    return null;
  }

  const { data, error } = await supabaseServer.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return null;
  }

  return getUserName(data.user);
};
