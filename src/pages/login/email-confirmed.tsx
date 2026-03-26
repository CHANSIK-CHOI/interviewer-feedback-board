import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { PageMeta } from "@/components/common";
import { useSession } from "@/components/session";
import { buildLoginHref, replaceSafely } from "@/lib/navigation/client";

const DEFAULT_NEXT_PATH = "/my";

export default function EmailConfirmedPage() {
  const router = useRouter();
  const { session, supabaseBrowserClient } = useSession();
  const isHandledRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || !supabaseBrowserClient) return;

    const fallbackTimer = window.setTimeout(() => {
      if (isHandledRef.current) return;

      const loginHref = buildLoginHref(router.query.next, DEFAULT_NEXT_PATH);
      isHandledRef.current = true;
      void replaceSafely(router, loginHref);
    }, 5000);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [router, router.isReady, router.query.next, supabaseBrowserClient]);

  useEffect(() => {
    if (!router.isReady || !supabaseBrowserClient || !session?.user || isHandledRef.current) return;

    let isUnmounted = false;
    const loginHref = buildLoginHref(router.query.next, DEFAULT_NEXT_PATH);

    const finish = async () => {
      if (isUnmounted || isHandledRef.current) return;
      isHandledRef.current = true;

      await supabaseBrowserClient.auth.signOut({ scope: "local" }).catch(() => undefined);
      await replaceSafely(router, loginHref);
    };

    void finish();

    return () => {
      isUnmounted = true;
    };
  }, [router, router.isReady, router.query.next, session?.user, supabaseBrowserClient]);

  return (
    <>
      <PageMeta
        title="이메일 인증 확인"
        ogTitle="이메일 인증 확인"
        description="이메일 인증 완료 후 로그인 화면으로 이동하는 중입니다."
      />

      <div className="mx-auto w-full max-w-xl">
        <section className="rounded-2xl border border-border/60 bg-white/80 p-7 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          이메일 인증을 확인하고 로그인 화면으로 이동하고 있습니다.
        </section>
      </div>
    </>
  );
}
