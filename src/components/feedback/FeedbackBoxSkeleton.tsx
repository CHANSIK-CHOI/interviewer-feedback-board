import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/shared/cn";
import React from "react";

export type FeedbackBoxSkeletonProps = {
  /** 안내 문구. 스크린리더로만 읽힌다. */
  label?: string;
  className?: string;
};

/**
 * FeedbackBox 와 같은 골격의 로딩 자리.
 * 데이터가 도착했을 때 높이가 튀지 않도록 여백과 크기를 카드와 맞췄다.
 */
export default function FeedbackBoxSkeleton({
  label = "피드백을 불러오는 중입니다.",
  className,
}: FeedbackBoxSkeletonProps) {
  return (
    <article
      role="status"
      aria-busy
      data-testid="feedback-box-skeleton"
      className={cn(
        "rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70",
        className
      )}
    >
      <span className="sr-only">{label}</span>

      {/* 상태 배지 + 날짜 / 평점 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {/* 아바타 + 이름 + 회사 + 수정 횟수 */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* 한줄평 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* 태그 */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>

      {/* 댓글 수 / 상세 보기 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </article>
  );
}
