import React, { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthActions } from "@/components/common";
import { Button, Switch } from "@/components/ui";
import { useTheme } from "next-themes";

const GITHUB_REPO_URL = "https://github.com/CHANSIK-CHOI/interviewer-feedback-board";

export default function GlobalLayout({ children }: { children: ReactNode }) {
  const [isThemeMounted, setIsThemeMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-clip bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_12%,rgba(160,160,160,0.18),transparent_55%),radial-gradient(circle_at_92%_12%,rgba(120,120,120,0.16),transparent_60%),radial-gradient(circle_at_20%_80%,rgba(90,90,90,0.12),transparent_60%),linear-gradient(160deg,rgba(255,255,255,0.85),rgba(235,235,235,0.95))] dark:bg-[radial-gradient(circle_at_12%_16%,rgba(160,160,160,0.12),transparent_55%),radial-gradient(circle_at_90%_20%,rgba(120,120,120,0.12),transparent_60%),radial-gradient(circle_at_20%_80%,rgba(90,90,90,0.1),transparent_60%),linear-gradient(160deg,rgba(10,10,10,0.98),rgba(24,24,24,0.98))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(160,160,160,0.2),transparent_70%)] opacity-70 dark:bg-[radial-gradient(circle,rgba(160,160,160,0.14),transparent_70%)] dark:opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -left-36 -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(120,120,120,0.18),transparent_70%)] opacity-70 dark:bg-[radial-gradient(circle,rgba(120,120,120,0.12),transparent_70%)] dark:opacity-40"
      />

      <header className="border-b border-border/60 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-3">
          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex w-fit shrink-0 items-center gap-0 rounded-full border border-transparent bg-transparent px-2 py-2 text-sm font-semibold text-foreground shadow-none transition hover:bg-muted/40 dark:border-transparent dark:bg-transparent sm:gap-2 sm:border-border/60 sm:bg-white/70 sm:px-3.5 sm:py-2 sm:shadow-sm sm:hover:bg-white/80 sm:hover:shadow-md dark:sm:border-white/10 dark:sm:bg-neutral-900/70"
            >
              <Image
                aria-hidden
                src="/icons/home.svg"
                alt="Home icon"
                width={16}
                height={16}
                className="shrink-0 dark:invert"
              />
              <span className="hidden text-base tracking-tight sm:inline sm:text-lg">
                홈으로 가기
              </span>
            </Link>
            <div className="ml-auto flex min-w-0 max-w-full items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-auto w-fit shrink-0 rounded-full border-transparent bg-transparent px-2 py-2 shadow-none hover:bg-muted/40 dark:border-transparent dark:bg-transparent sm:h-7 sm:border-input sm:bg-input/30 sm:px-2.5 sm:py-0 sm:shadow-none sm:hover:bg-input/50"
              >
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub 저장소 열기"
                >
                  <Image
                    src="/icons/github.svg"
                    alt="GitHub icon"
                    width={16}
                    height={16}
                    className="shrink-0 dark:invert"
                  />
                  <span className="hidden sm:inline">GitHub</span>
                </a>
              </Button>
              <div className="min-w-0 max-w-full">
                <AuthActions />
              </div>
            </div>
          </div>
          <div className="flex w-full justify-end">
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-transparent bg-transparent px-2 py-2 text-xs font-medium text-foreground shadow-none dark:border-transparent dark:bg-transparent sm:border-border/60 sm:bg-white/70 sm:px-3 sm:py-1.5 sm:shadow-sm dark:sm:border-white/10 dark:sm:bg-neutral-900/70">
              <span>Dark</span>
              <Switch
                checked={isThemeMounted ? isDarkMode : false}
                disabled={!isThemeMounted}
                aria-label="다크 모드 전환"
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-6 pb-12 pt-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <section className="grid gap-6">
            <div className="flex flex-col gap-5">{children}</div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/60 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-4 px-6 py-4 text-sm text-muted-foreground">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-foreground"
          >
            <Image
              src="/icons/github.svg"
              alt="GitHub icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            GitHub
          </a>
          <a
            href="https://velog.io/@ckstlr0828/posts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-foreground"
          >
            <Image
              src="/icons/velog.svg"
              alt="Velog icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            Velog
          </a>
        </div>
      </footer>
    </div>
  );
}
