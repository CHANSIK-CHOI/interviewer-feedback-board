import React from "react";
import Image from "next/image";
import { Button, useAlert } from "@/components/ui";
import { useSession } from "@/components/session";

export default function GithubLoginBtn() {
  const { supabaseBrowserClient } = useSession();
  const { openAlert } = useAlert();

  const handleLoginGithub = async () => {
    if (!supabaseBrowserClient) {
      console.error("Supabase 클라이언트를 초기화하지 못했습니다.");
      return;
    }

    const { error } = await supabaseBrowserClient.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/login/oauth-callback`,
      },
    });

    if (!error) return;

    console.error("GitHub OAuth sign-in failed", error);
    openAlert({
      description: "GitHub 로그인에 실패했습니다.",
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full gap-2 rounded-full border-primary/30 bg-white/70 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-neutral-900/70"
      onClick={handleLoginGithub}
    >
      <Image src="/icons/github.svg" alt="GitHub" width={18} height={18} className="dark:invert" />
      GitHub로 로그인
    </Button>
  );
}
