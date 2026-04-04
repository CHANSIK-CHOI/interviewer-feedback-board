import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { PageMeta } from "@/components/common";
import { useSession } from "@/components/session";
import { getUserName } from "@/lib/user/profile";
import { NewFeedbackLinkBtn } from "@/components/feedback";

type StackBadge = {
  label: string;
  iconSrc?: string;
  isInvertedInDarkMode?: boolean;
};

const CORE_STACK_BADGES: StackBadge[] = [
  { label: "Next.js Page Router", iconSrc: "/icons/nextjs.svg", isInvertedInDarkMode: true },
  { label: "Supabase", iconSrc: "/icons/supabase.svg" },
  { label: "TypeScript" },
  { label: "React Hook Form" },
  { label: "shadcn/ui" },
  { label: "Tailwind CSS" },
];

const DELIVERY_BADGES: StackBadge[] = [
  { label: "Vercel", iconSrc: "/icons/vercel.svg", isInvertedInDarkMode: true },
  { label: "GitHub", iconSrc: "/icons/github.svg", isInvertedInDarkMode: true },
];

export default function HomePage() {
  const { session, hasAdminRole, isRoleLoading } = useSession();
  const roleLabel = isRoleLoading ? "확인 중..." : hasAdminRole ? "admin" : "reviewer";
  const userName = getUserName(session?.user);

  return (
    <>
      <PageMeta
        title="홈"
        ogTitle="인터뷰어 피드백 보드 홈"
        description="Next.js 14 Page Router와 Supabase로 구현한 권한 기반 인터뷰어 피드백 보드 포트폴리오입니다. 작성-검토-공개 워크플로우와 역할별 데이터 가시성 분리를 다룹니다."
      />

      <div className="grid gap-6">
        <section className="relative grid gap-6 overflow-hidden rounded-3xl border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(235,235,235,0.96))] p-6 shadow-lg dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(12,12,12,0.95),rgba(24,24,24,0.95))] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 -top-40 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(160,160,160,0.16),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(160,160,160,0.12),transparent_70%)]"
          />
          <div className="relative z-10 flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-primary-foreground">
              Project Specs
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Next.js 14 Page Router +
              <br />
              Supabase로 만든
              <br />
              권한 기반 피드백 보드
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              단순 CRUD보다 권한 모델, 상태 전이, 공개 데이터와 권한 데이터 분리 렌더링에 초점을
              맞춘 포트폴리오 프로젝트입니다.
            </p>
          </div>
          <aside className="relative z-10 grid gap-3">
            <div className="rounded-2xl border border-border/60 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Core Stack
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {CORE_STACK_BADGES.map((stack) => (
                  <span
                    key={stack.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-neutral-800/70"
                  >
                    {stack.iconSrc && (
                      <Image
                        src={stack.iconSrc}
                        alt={`${stack.label} icon`}
                        width={12}
                        height={12}
                        className={stack.isInvertedInDarkMode ? "dark:invert" : undefined}
                      />
                    )}
                    {stack.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Delivery
              </span>
              <strong className="mt-2 block text-lg font-semibold text-foreground">
                Vercel 배포 · GitHub 형상관리
              </strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                API Routes 기반 BFF, Supabase Auth/DB/Storage, 온디맨드 재검증 흐름을 적용했습니다.
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {DELIVERY_BADGES.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-neutral-800/70"
                  >
                    {item.iconSrc && (
                      <Image
                        src={item.iconSrc}
                        alt={`${item.label} icon`}
                        width={12}
                        height={12}
                        className={item.isInvertedInDarkMode ? "dark:invert" : undefined}
                      />
                    )}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-border/60 bg-background/80 p-8 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Portfolio Home
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            인터뷰어 피드백 보드
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            이 프로젝트의 메인 화면은{" "}
            <span className="font-semibold text-foreground">/feedback</span>
            입니다. 공개 목록은 정적으로 제공하고, 로그인 이후에는 작성자/관리자 권한에 맞는
            데이터를 API로 추가 조회해 하나의 보드로 병합합니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/feedback">피드백 보드 바로가기</Link>
            </Button>
            <NewFeedbackLinkBtn />
            {!session && (
              <Button asChild variant="outline">
                <Link href="/login">로그인</Link>
              </Button>
            )}
            {!isRoleLoading && hasAdminRole && (
              <Button asChild variant="outline">
                <Link href="/admin/feedback">관리자 검토 큐</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current User
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {session ? userName : "비회원"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {session ? "로그인 완료" : "비로그인 상태"}
            </p>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Permission Model
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{roleLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              reviewer는 본인 데이터 중심, admin은 검토 큐와 상태 변경 권한을 가집니다.
            </p>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Board Route
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">/feedback</p>
            <p className="mt-1 text-sm text-muted-foreground">
              `approved` 공개 목록을 기본으로, `revised_pending` preview와 역할별 전용 데이터를
              조건부 병합합니다.
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h3 className="text-lg font-semibold text-foreground">작동 흐름</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/70 p-4 dark:border-white/10 dark:bg-neutral-900/60">
              <p className="text-sm font-semibold text-foreground">1. 작성</p>
              <p className="mt-1 text-xs text-muted-foreground">
                인터뷰어가 피드백을 작성하면 `pending` 상태로 저장됩니다.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4 dark:border-white/10 dark:bg-neutral-900/60">
              <p className="text-sm font-semibold text-foreground">2. 검토</p>
              <p className="mt-1 text-xs text-muted-foreground">
                관리자가 `approve`, `reject`, `reopen`으로 상태 전이를 처리합니다.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4 dark:border-white/10 dark:bg-neutral-900/60">
              <p className="text-sm font-semibold text-foreground">3. 공개</p>
              <p className="mt-1 text-xs text-muted-foreground">
                `approved`와 `is_public=true`인 글만 공개되고, 수정 대기는 preview로 유지됩니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
