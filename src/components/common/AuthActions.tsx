import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui";
import { useSession } from "@/components/session";
import { pushSafely, replaceSafely } from "@/lib/navigation/client";
import { checkAvatarApiSrcPrivate } from "@/lib/avatar/path";
import { getUserName, getAvatarUrl } from "@/lib/user/profile";

export default function AuthActions() {
  const { session, supabaseClient } = useSession();
  const router = useRouter();
  const [isLogging, setIsLogging] = useState(false);

  const handleLogout = async () => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.auth.signOut({ scope: "global" });
      // signOut({ scope: "global" }) : 서버 쪽(리프레시 토큰 포함)까지 로그아웃하려는 시도입니다.
      if (error?.name === "AuthSessionMissingError") {
        // 현재 탭에 세션이 이미 없으면 AuthSessionMissingError가 날 수 있음 예: 다른 탭에서 이미 로그아웃, 토큰 만료, 로컬 세션 손실
        // signOut({ scope: "local" })를 한 번 더 호출해서 클라이언트 로컬 auth 상태라도 확실히 정리
        await supabaseClient.auth.signOut({ scope: "local" });
      }
    } finally {
      // 로그아웃 직후 서버 쿠키를 즉시 정리해서 SSR 권한 체크를 바로 반영한다.
      await fetch("/api/auth/session", { method: "DELETE" });
      await replaceSafely(router, "/");
    }
  };
  const handleClickLogin = async () => {
    if (isLogging) return;
    setIsLogging(true);
    try {
      await pushSafely(router, "/login");
    } finally {
      setIsLogging(false);
    }
  };

  const user = session?.user;
  const userName = getUserName(user);
  const avatarSrc = getAvatarUrl(user);
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
      {!session?.access_token ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto w-fit shrink-0 rounded-full border-transparent bg-transparent px-2 py-2 shadow-none hover:bg-muted/40 dark:border-transparent dark:bg-transparent sm:h-7 sm:border-input sm:bg-input/30 sm:px-2.5 sm:py-0 sm:shadow-none sm:hover:bg-input/50"
          onClick={handleClickLogin}
          disabled={isLogging}
        >
          로그인
        </Button>
      ) : (
        <>
          <div className="hidden min-w-0 max-w-full items-center gap-2 rounded-full border border-transparent bg-transparent px-1 py-1 text-sm shadow-none dark:border-transparent dark:bg-transparent sm:inline-flex sm:border-border/60 sm:bg-white/70 sm:px-3 sm:py-1.5 sm:shadow-sm dark:sm:border-white/10 dark:sm:bg-neutral-900/70">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-transparent bg-transparent text-xs font-semibold text-primary sm:border-border/60 sm:bg-muted">
              <Image
                className="h-full w-full object-cover"
                src={avatarSrc}
                alt={`${userName} avatar`}
                width={50}
                height={50}
                unoptimized={
                  avatarSrc.startsWith("data:") ||
                  avatarSrc.startsWith("blob:") ||
                  checkAvatarApiSrcPrivate(avatarSrc)
                }
              />
            </span>
            <span className="min-w-0 max-w-[10rem] truncate whitespace-nowrap text-sm font-medium text-foreground sm:max-w-[14rem]">
              {userName} 님
            </span>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-auto w-fit shrink-0 rounded-full border-transparent bg-transparent px-2 py-2 shadow-none hover:bg-muted/40 dark:border-transparent dark:bg-transparent sm:h-7 sm:border-input sm:bg-input/30 sm:px-2.5 sm:py-0 sm:shadow-none sm:hover:bg-input/50"
          >
            <Link href="/my">마이페이지</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-auto w-fit shrink-0 rounded-full border-transparent bg-transparent px-2 py-2 shadow-none hover:bg-muted/40 dark:border-transparent dark:bg-transparent sm:h-7 sm:border-input sm:bg-input/30 sm:px-2.5 sm:py-0 sm:shadow-none sm:hover:bg-input/50"
            onClick={handleLogout}
          >
            로그아웃
          </Button>
        </>
      )}
    </div>
  );
}
