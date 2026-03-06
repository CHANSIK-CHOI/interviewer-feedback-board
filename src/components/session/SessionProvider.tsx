import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SessionContext } from "./useSession";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { syncUserRole, SyncUserRoleResult } from "@/lib/user-role/client";
import type { UserRole } from "@/types/user-role";
import { SessionCookieSyncResponse } from "@/types/response";

type SessionProviderProps = {
  children: ReactNode;
};

const CACHE_KEY = (id: string) => `role:${id}`;
const CACHE_TTL = 5 * 60 * 1000; // 5분

export default function SessionProvider({ children }: SessionProviderProps) {
  const supabaseClient: SupabaseClient | null = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitSessionComplete, setIsInitSessionComplete] = useState(false);
  const [isAdminUi, setIsAdminUi] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const syncedTokenRef = useRef<string | null>(null);

  /*
    applyRoleUiState
    - userId & role
    - isLoading : role 권한 부여 진행중
    - isCacheWriteEnabled : sessionStorage에 user id & role 저장 여부
  */
  const applyRoleUiState = useCallback(
    ({
      userId,
      role,
      isLoading = false,
      isCacheWriteEnabled = true,
    }: {
      userId: string;
      role: UserRole["role"] | null;
      isLoading?: boolean;
      isCacheWriteEnabled?: boolean;
    }) => {
      setIsAdminUi(role === "admin");
      setIsRoleLoading(isLoading);

      if (isCacheWriteEnabled) {
        const cacheKey = CACHE_KEY(userId);
        sessionStorage.setItem(cacheKey, JSON.stringify({ role, ts: Date.now() }));
      }
    },
    []
  );

  /* session 업데이트, session init 상태 업데이트 */
  useEffect(() => {
    if (!supabaseClient) {
      setIsInitSessionComplete(false);
      return;
    }
    let isMounted = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsInitSessionComplete(true);
    });

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsInitSessionComplete(true);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabaseClient]);

  /* 유저의 role 업데이트, role 부여 여부 업데이트 */
  useEffect(() => {
    // /login/oauth-callback 페이지에서만 해당 로직 막음
    if (typeof window !== "undefined" && window.location.pathname === "/login/oauth-callback") {
      setIsRoleLoading(false);
      return;
    }

    // 회원가입 후 첫 login은 skip -> 회원가입 후 자동 로그인 처리가 되기 떄문에 session이 감지가 됨 그 경우 스킵 처리 후 유저가 로그인을 직접 했을 때 아래 로직 수행
    // const isSignUpComplete = sessionStorage.getItem("signUpCompleteAndSkipRoleSync") === "1";
    // if (isSignUpComplete) {
    //   sessionStorage.removeItem("signUpCompleteAndSkipRoleSync");
    //   setIsAdminUi(false);
    //   setIsRoleLoading(false);
    //   return;
    // }

    if (!session?.user?.id || !session.access_token) {
      setIsAdminUi(false);
      setIsRoleLoading(false);
      return;
    }

    // 케시 처리로 api 호출 횟수를 줄임
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
        });

        const isFresh = typeof ts === "number" && Date.now() - ts < CACHE_TTL;
        if (isFresh) return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // 세션 생성 시 user_roles를 동기화한다. (github 로그인시 oauth-callback 페이지에서 진행)
    const runRoleSync = async () => {
      setIsRoleLoading(true);
      const { role }: SyncUserRoleResult = await syncUserRole(session.access_token);
      applyRoleUiState({ userId: session.user.id, role });
    };

    runRoleSync().catch((error) => {
      console.error(error);
      setIsAdminUi(false);
      setIsRoleLoading(false);
    });
  }, [session?.user?.id, session?.access_token, applyRoleUiState]);

  /* 클라이언트 세션(access token)”을 “서버용 HttpOnly 쿠키”로 동기화 */
  useEffect(() => {
    const syncSessionCookie = async () => {
      // 서버가 sb-access-token 쿠키를 만료(Max-Age=0)시켜 삭제
      if (!session?.access_token) {
        syncedTokenRef.current = null;
        await fetch("/api/auth/session", {
          method: "DELETE",
        });
        return;
      }

      // 토큰이 있고, 이전에 동기화한 토큰과 같으면 요청 생략
      if (syncedTokenRef.current === session.access_token) return;

      // 새 토큰이면 POST /api/auth/session 호출
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
    };

    syncSessionCookie().catch((error) => {
      console.error(error);
    });
  }, [session?.access_token]);

  return (
    <SessionContext.Provider
      value={{
        session,
        supabaseClient,
        isInitSessionComplete,
        isAdminUi,
        isRoleLoading,
        applyRoleUiState,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
