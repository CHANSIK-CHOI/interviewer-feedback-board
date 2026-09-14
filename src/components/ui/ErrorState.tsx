import { Button } from "@/components/ui/radix-ui/button";
import { cn } from "@/lib/shared/cn";
import { RefreshCw, TriangleAlert } from "lucide-react";
import React, { type ReactNode } from "react";

export type ErrorStateProps = {
  /** 무엇이 실패했는지 한 줄. */
  title?: string;
  /** 다음에 무엇을 하면 되는지. 없으면 렌더하지 않는다. */
  description?: ReactNode;
  /**
   * banner - 목록 위에 얇게 한 줄. 옆의 데이터는 그대로 보여줄 때.
   * block  - 영역 전체가 실패했을 때 자리를 차지하는 카드.
   */
  variant?: "banner" | "block";
  /** 넘기지 않으면 재시도 버튼 자체가 렌더되지 않는다. */
  onRetry?: () => void;
  isRetrying?: boolean;
  retryText?: string;
  className?: string;
};

export default function ErrorState({
  title = "데이터를 불러오지 못했습니다.",
  description,
  variant = "banner",
  onRetry,
  isRetrying = false,
  retryText = "다시 시도",
  className,
}: ErrorStateProps) {
  const retryButton = onRetry ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onRetry}
      disabled={isRetrying}
      aria-busy={isRetrying}
      data-testid="error-state-retry"
      className="shrink-0"
    >
      <RefreshCw aria-hidden className={cn({ "animate-spin": isRetrying })} />
      {isRetrying ? "불러오는 중" : retryText}
    </Button>
  ) : null;

  if (variant === "block") {
    return (
      <div
        role="alert"
        data-testid="error-state"
        className={cn(
          "flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-background/80 p-6 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70",
          className
        )}
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {retryButton}
      </div>
    );
  }

  return (
    <div
      role="alert"
      data-testid="error-state"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 dark:border-destructive/40 dark:bg-destructive/10",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {retryButton}
    </div>
  );
}
