import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { syncUserRole, SyncUserRoleResult } from "@/lib/user-role/client";
import { consumeSignUpRoleSyncSkip } from "@/lib/auth/signup-flow";
import type { UserRole } from "@/types/user-role";
import type { ApplyRoleUiStateParams } from "./useSession";

type CachedRoleState = {
  role: UserRole["role"] | null;
  ts: number;
};

type UseSessionRoleUiResult = {
  isAdminUi: boolean;
  isRoleLoading: boolean;
  applyRoleUiState: (params: ApplyRoleUiStateParams) => void;
};

const CACHE_TTL = 5 * 60 * 1000;
const ROLE_SYNC_EXCLUDED_PATHS = new Set(["/login/oauth-callback", "/login/email-confirmed"]);

const getRoleCacheKey = (userId: string) => `role:${userId}`;

const isRoleSyncExcludedPath = (pathname: string) => ROLE_SYNC_EXCLUDED_PATHS.has(pathname);

const writeCachedRoleState = (userId: string, role: UserRole["role"] | null) => {
  sessionStorage.setItem(getRoleCacheKey(userId), JSON.stringify({ role, ts: Date.now() }));
};

const readCachedRoleState = (
  userId: string
): { role: UserRole["role"] | null; isFresh: boolean } | null => {
  const cached = sessionStorage.getItem(getRoleCacheKey(userId));
  if (!cached) {
    return null;
  }

  try {
    const parsed = JSON.parse(cached) as Partial<CachedRoleState>;
    const role = parsed.role ?? null;
    const isFresh = typeof parsed.ts === "number" && Date.now() - parsed.ts < CACHE_TTL;

    return { role, isFresh };
  } catch {
    sessionStorage.removeItem(getRoleCacheKey(userId));
    return null;
  }
};

export function useSessionRoleUi(session: Session | null): UseSessionRoleUiResult {
  const [isAdminUi, setIsAdminUi] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  const applyRoleUiState = useCallback(
    ({ userId, role, isLoading = false, isCacheWriteEnabled = true }: ApplyRoleUiStateParams) => {
      setIsAdminUi(role === "admin");
      setIsRoleLoading(isLoading);

      if (isCacheWriteEnabled) {
        writeCachedRoleState(userId, role);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window !== "undefined" && isRoleSyncExcludedPath(window.location.pathname)) {
      setIsRoleLoading(false);
      return;
    }

    const isSignUpComplete = consumeSignUpRoleSyncSkip();
    if (isSignUpComplete) {
      setIsAdminUi(false);
      setIsRoleLoading(false);
      return;
    }

    if (!session?.user?.id || !session.access_token) {
      setIsAdminUi(false);
      setIsRoleLoading(false);
      return;
    }

    const cachedRoleState = readCachedRoleState(session.user.id);
    if (cachedRoleState) {
      applyRoleUiState({
        userId: session.user.id,
        role: cachedRoleState.role,
        isLoading: false,
        isCacheWriteEnabled: false,
      } satisfies ApplyRoleUiStateParams);

      if (cachedRoleState.isFresh) {
        return;
      }
    }

    setIsRoleLoading(true);
    void syncUserRole(session.access_token)
      .then(({ role }: SyncUserRoleResult) => {
        applyRoleUiState({ userId: session.user.id, role } satisfies ApplyRoleUiStateParams);
      })
      .catch((error) => {
        console.error(error);
        setIsAdminUi(false);
        setIsRoleLoading(false);
      });
  }, [session?.user?.id, session?.access_token, applyRoleUiState]);

  return {
    isAdminUi,
    isRoleLoading,
    applyRoleUiState,
  };
}
