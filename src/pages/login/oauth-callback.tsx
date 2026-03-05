import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import { useSession } from "@/components/session";
import { replaceSafely } from "@/lib/navigation/client";
import { syncUserRole } from "@/lib/user-role/client";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { supabaseClient, applyRoleUiState } = useSession();
  const isHandledRef = useRef(false);
  // isHandledRef : getSession + onAuthStateChange + fallback에서 handleSession이 여러 번 불려도 실처리는 1번만 하게 막음.

  useEffect(() => {
    if (!supabaseClient) return;

    let isUnmounted = false;
    // isUnmounted : 컴포넌트 언마운트 후 비동기 완료 시점에 라우팅/상태 변경 같은 후속 작업을 중단해서 안전하게 종료.

    const handleSession = async (session: Session | null) => {
      if (isUnmounted || isHandledRef.current || !session?.user) return;
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
      // if (isNewUser) {
      //   sessionStorage.setItem("signUpCompleteAndSkipRoleSync", "1");
      // }
      await replaceSafely(router, isNewUser ? "/my" : "/");
    };

    void supabaseClient.auth
      .getSession()
      .then(({ data }) => handleSession(data.session))
      .catch(() => undefined);

    // OAuth 처리 중 세션이 나중에 생길 수 있어서 이벤트 구독 / INITIAL_SESSION/SIGNED_IN 때 handleSession()
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        void handleSession(session);
      }
    });

    // handleSession 으로 실패 시 setTimeout 으로 /login 으로 강제 이동 시킴
    const fallbackTimer = window.setTimeout(() => {
      if (isUnmounted || isHandledRef.current) return;
      isHandledRef.current = true;
      void replaceSafely(router, "/login");
    }, 5000);

    return () => {
      isUnmounted = true;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [router, supabaseClient, applyRoleUiState]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <section className="rounded-2xl border border-border/60 bg-white/80 p-7 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
        GitHub 로그인 정보를 확인하고 있습니다.
      </section>
    </div>
  );
}
