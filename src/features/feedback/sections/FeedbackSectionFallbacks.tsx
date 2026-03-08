import React from "react";
import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/shared/cn";

type FeedbackSectionErrorStateProps = {
  title: string;
  description: string;
  onRetry: () => void;
  className?: string;
};

function FeedbackStatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <Skeleton className="h-[12px] w-[52px] rounded-full" />
      <Skeleton className="mt-3 h-[28px] w-[72px] rounded-full" />
    </div>
  );
}

export function FeedbackSummarySectionSkeleton({ isAdminUi }: { isAdminUi: boolean }) {
  return (
    <section
      className={cn("grid gap-4", {
        "md:grid-cols-3": isAdminUi,
        "md:grid-cols-2": !isAdminUi,
      })}
    >
      {Array.from({ length: isAdminUi ? 3 : 2 }).map((_, index) => (
        <FeedbackStatCardSkeleton key={index} />
      ))}
    </section>
  );
}

export function FeedbackAdminPendingCountCardSkeleton() {
  return <FeedbackStatCardSkeleton />;
}

export function FeedbackAdminPendingCountCardErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        승인 대기
      </p>
      <p className="mt-2 text-sm text-muted-foreground">불러오지 못했습니다.</p>
      <Button className="mt-3" onClick={onRetry} size="sm" variant="outline">
        다시 시도
      </Button>
    </div>
  );
}

export function FeedbackListSectionSkeleton() {
  return (
    <section className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <article
          className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70"
          key={index}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-[20px] w-[100px] rounded-full" />
              <Skeleton className="h-[16px] w-[140px] rounded-full" />
            </div>
            <Skeleton className="h-[18px] w-[80px] rounded-full" />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-[40px] w-[40px] rounded-full" />
              <Skeleton className="h-[18px] w-[120px] rounded-full" />
              <Skeleton className="h-[20px] w-[90px] rounded-full" />
            </div>
            <Skeleton className="h-[24px] w-full rounded-xl" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-[24px] w-[90px] rounded-full" />
              <Skeleton className="h-[24px] w-[80px] rounded-full" />
              <Skeleton className="h-[24px] w-[110px] rounded-full" />
            </div>
          </div>

          <div className="mt-4">
            <Skeleton className="h-[28px] w-[76px] rounded-full" />
          </div>
        </article>
      ))}
    </section>
  );
}

export function FeedbackSectionErrorState({
  title,
  description,
  onRetry,
  className,
}: FeedbackSectionErrorStateProps) {
  return (
    <section className={className}>
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 shadow-sm">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button className="mt-4" onClick={onRetry} variant="outline">
          다시 시도
        </Button>
      </div>
    </section>
  );
}
