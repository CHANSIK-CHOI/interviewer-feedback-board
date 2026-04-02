import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ApplyRoleUiStateParams, SessionContext } from "./useSession";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { resolveAccessToken } from "@/lib/auth/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { syncUserRole, SyncUserRoleResult } from "@/lib/user-role/client";
import { consumeSignUpRoleSyncSkip } from "@/lib/auth/signup-flow";
import type { UserRole } from "@/types/user-role";
import { SessionCookieSyncResponse } from "@/types/response";

type SessionProviderProps = {
  children: ReactNode;
};

const CACHE_KEY = (id: string) => `role:${id}`;
const CACHE_TTL = 5 * 60 * 1000;

export default function SessionProvider({ children }: SessionProviderProps) {
  const supabaseBrowserClient: SupabaseClient | null = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitSessionComplete, setIsInitSessionComplete] = useState(false);
  const [isAdminUi, setIsAdminUi] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const syncedTokenRef = useRef<string | null>(null);

  const applyRoleUiState = useCallback(
    ({ userId, role, isLoading = false, isCacheWriteEnabled = true }: ApplyRoleUiStateParams) => {
      setIsAdminUi(role === "admin");
      setIsRoleLoading(isLoading);

      if (isCacheWriteEnabled) {
        const cacheKey = CACHE_KEY(userId);
        sessionStorage.setItem(cacheKey, JSON.stringify({ role, ts: Date.now() }));
      }
    },
    []
  );

  const getAccessToken = useCallback(() => {
    return resolveAccessToken({
      supabaseBrowserClient,
      fallbackAccessToken: session?.access_token ?? null,
    });
  }, [session?.access_token, supabaseBrowserClient]);

  useEffect(() => {
    if (!supabaseBrowserClient) {
      setIsInitSessionComplete(false);
      return;
    }
    let isMounted = true;

    supabaseBrowserClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsInitSessionComplete(true);
    });

    const { data: subscription } = supabaseBrowserClient.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setIsInitSessionComplete(true);
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabaseBrowserClient]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.pathname === "/login/oauth-callback" ||
        window.location.pathname === "/login/email-confirmed")
    ) {
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

    const cacheKey = CACHE_KEY(session.user.id);
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        const { role, ts }: { role?: UserRole["role"] | null; ts?: number } = JSON.parse(cached);
        applyRoleUiState({
          userId: session.user.id,
          role: role ?? null,
          isLoading: false,
          isCacheWriteEnabled: false,
        } satisfies ApplyRoleUiStateParams);

        const isFresh = typeof ts === "number" && Date.now() - ts < CACHE_TTL;
        if (isFresh) return;
      } catch {
        sessionStorage.removeItem(cacheKey);
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

  useEffect(() => {
    void (async () => {
      if (!session?.access_token) {
        syncedTokenRef.current = null;
        await fetch("/api/auth/session", {
          method: "DELETE",
        });
        return;
      }

      if (syncedTokenRef.current === session.access_token) return;

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload: SessionCookieSyncResponse = await response
        .json()
        .catch(() => ({ data: null, error: "Invalid response" }));
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to sync session cookie");
      }

      syncedTokenRef.current = session.access_token;
    })().catch((error) => {
      console.error(error);
    });
  }, [session?.access_token]);

  return (
    <SessionContext.Provider
      value={{
        session,
        supabaseBrowserClient,
        isInitSessionComplete,
        isAdminUi,
        isRoleLoading,
        applyRoleUiState,
        getAccessToken,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
