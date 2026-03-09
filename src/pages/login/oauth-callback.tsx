import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "@/components/session";
import { markSignUpRoleSyncSkip } from "@/lib/auth/signup-flow";
import { replaceSafely } from "@/lib/navigation/client";
import { syncUserRole } from "@/lib/user-role/client";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { session, supabaseClient, applyRoleUiState } = useSession();
  const isHandledRef = useRef(false);
  // isHandledRef : SessionProvider의 세션 변화와 fallback이 겹쳐도 실처리는 1번만 하게 막음.

  useEffect(() => {
    if (!router.isReady || !supabaseClient) return;

    const fallbackTimer = window.setTimeout(() => {
      if (isHandledRef.current) return;
      isHandledRef.current = true;
      void replaceSafely(router, "/login");
    }, 5000);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [router, router.isReady, supabaseClient]);

  useEffect(() => {
    if (!router.isReady || !session?.user || isHandledRef.current) return;

    let isUnmounted = false;
    // isUnmounted : 컴포넌트 언마운트 후 비동기 완료 시점에 라우팅/상태 변경 같은 후속 작업을 중단해서 안전하게 종료.

    const handleSession = async () => {
      if (isUnmounted || isHandledRef.current) return;
      isHandledRef.current = true;

      if (!session.access_token) {
        await replaceSafely(router, "/login");
        return;
      }

      applyRoleUiState({
        userId: session.user.id,
        role: null,
        isLoading: true,
        isCacheWriteEnabled: false,
      });

      let roleSyncResult: { role: "admin" | "reviewer"; isNewUser: boolean };
      try {
        roleSyncResult = await syncUserRole(session.access_token);
      } catch {
        applyRoleUiState({
          userId: session.user.id,
          role: null,
          isLoading: false,
          isCacheWriteEnabled: false,
        });
        await replaceSafely(router, "/login");
        return;
      }

      const { role, isNewUser } = roleSyncResult;
      applyRoleUiState({ userId: session.user.id, role, isLoading: false });
      if (isNewUser) {
        markSignUpRoleSyncSkip();
      }
      await replaceSafely(router, isNewUser ? "/my" : "/");
    };

    void handleSession();

    return () => {
      isUnmounted = true;
    };
  }, [router, router.isReady, session?.access_token, session?.user, applyRoleUiState]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <section className="rounded-2xl border border-border/60 bg-white/80 p-7 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
        GitHub 로그인 정보를 확인하고 있습니다.
      </section>
    </div>
  );
}
