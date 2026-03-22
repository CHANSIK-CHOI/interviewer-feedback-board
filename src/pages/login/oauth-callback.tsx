import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { PageMeta } from "@/components/common";
import { useSession } from "@/components/session";
import { markSignUpRoleSyncSkip } from "@/lib/auth/signup-flow";
import { replaceSafely } from "@/lib/navigation/client";
import { syncUserRole } from "@/lib/user-role/client";
import { ApplyRoleUiStateParams } from "@/components/session/useSession";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { session, supabaseClient, applyRoleUiState } = useSession();
  const isHandledRef = useRef(false);

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
      } satisfies ApplyRoleUiStateParams);

      let roleSyncResult: { role: "admin" | "reviewer"; isNewUser: boolean };
      try {
        roleSyncResult = await syncUserRole(session.access_token);
      } catch {
        applyRoleUiState({
          userId: session.user.id,
          role: null,
          isLoading: false,
          isCacheWriteEnabled: false,
        } satisfies ApplyRoleUiStateParams);
        await replaceSafely(router, "/login");
        return;
      }

      const { role, isNewUser } = roleSyncResult;
      applyRoleUiState({
        userId: session.user.id,
        role,
        isLoading: false,
      } satisfies ApplyRoleUiStateParams);
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
    <>
      <PageMeta
        title="GitHub 로그인 처리 중"
        ogTitle="GitHub 로그인 처리 중"
        description="GitHub 로그인 정보를 확인하고 세션을 초기화하고 있습니다."
      />

      <div className="mx-auto w-full max-w-xl">
        <section className="rounded-2xl border border-border/60 bg-white/80 p-7 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          GitHub 로그인 정보를 확인하고 있습니다.
        </section>
      </div>
    </>
  );
}
