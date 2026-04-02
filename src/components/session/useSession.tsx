import { useContext, createContext } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/user-role";

export type ApplyRoleUiStateParams = {
  userId: string;
  role: UserRole["role"] | null;
  isLoading?: boolean;
  isCacheWriteEnabled?: boolean;
};

type SessionContextValue = {
  session: Session | null;
  supabaseBrowserClient: SupabaseClient | null;
  isInitSessionComplete: boolean;
  isAdminUi: boolean;
  isRoleLoading: boolean;
  applyRoleUiState: (params: ApplyRoleUiStateParams) => void;
  getAccessToken: () => Promise<string>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("SessionProvider 안에서만 사용하세요");
  }
  return ctx;
}
