import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { getUserName } from "@/lib/user/profile";

export const getAuthUserNameById = async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return null;
  }

  const { data, error } = await supabaseServerAdminClient.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return null;
  }

  return getUserName(data.user);
};
