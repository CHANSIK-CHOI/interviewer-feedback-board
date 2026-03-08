import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import type { User } from "@supabase/supabase-js";

export const getUserName = (user: User | undefined) => {
  const rawName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.user_name ||
    user?.email?.split("@")[0];
  const userName = rawName ? String(rawName) : "알 수 없는 사용자";

  return userName;
};

export const getUserCompany = (user: User | undefined) => {
  const companyName = user?.user_metadata.company_name;
  const sessionCompanyName = typeof companyName === "string" ? companyName : "";
  const isCompanyPublic = user?.user_metadata.is_company_public;
  const sessionIsCompanyPublic = isCompanyPublic === true;
  return { sessionCompanyName, sessionIsCompanyPublic };
};

export const getAvatarUrl = (user: User | undefined) => {
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.avatar ||
    AVATAR_PLACEHOLDER_SRC;

  return avatarUrl;
};
