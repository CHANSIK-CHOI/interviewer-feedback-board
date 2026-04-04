import React, { ReactNode, useCallback } from "react";
import { SessionContext } from "./useSession";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getClientAccessTokenOrThrow } from "@/lib/auth/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useBrowserSession } from "./useBrowserSession";
import { useSessionRoleUi } from "./useSessionRoleUi";
import { useSessionCookieSync } from "./useSessionCookieSync";

type SessionProviderProps = {
  children: ReactNode;
};

export default function SessionProvider({ children }: SessionProviderProps) {
  const supabaseBrowserClient: SupabaseClient | null = getSupabaseBrowserClient();
  const { session, isInitSessionComplete } = useBrowserSession(supabaseBrowserClient);
  const { hasAdminRole, isRoleLoading, applyRoleUiState } = useSessionRoleUi(session);

  const getAccessTokenOrThrow = useCallback(() => {
    return getClientAccessTokenOrThrow({
      supabaseBrowserClient,
      fallbackAccessToken: session?.access_token ?? null,
    });
  }, [session?.access_token, supabaseBrowserClient]);

  useSessionCookieSync(session?.access_token ?? null);

  return (
    <SessionContext.Provider
      value={{
        session,
        supabaseBrowserClient,
        isInitSessionComplete,
        hasAdminRole,
        isRoleLoading,
        applyRoleUiState,
        getAccessTokenOrThrow,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
