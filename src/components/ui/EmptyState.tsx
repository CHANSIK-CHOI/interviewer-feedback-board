import { cn } from "@/lib/shared/cn";
import { Inbox } from "lucide-react";
import React, { type ReactNode } from "react";

export type EmptyStateProps = {
  /** 기본 아이콘을 바꾸고 싶을 때만 넘긴다. 예) <SearchX className="h-5 w-5" /> */
  icon?: ReactNode;
  /** 왜 비어 있는지 한 줄. */
  title: string;
  /** 다음에 무엇을 할 수 있는지. 없으면 렌더하지 않는다. */
  description?: ReactNode;
  /** 버튼이나 링크. 없으면 렌더하지 않는다. */
  action?: ReactNode;
  /**
   * block  - 목록 자리를 대신 채우는 큰 영역.
   * inline - 카드 안이나 좁은 자리에 들어가는 한 줄.
   */
  variant?: "block" | "inline";
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "block",
  className,
}: EmptyStateProps) {
  if (variant === "inline") {
    return (
      <div
        data-testid="empty-state"
        className={cn(
          "rounded-2xl border border-border/60 bg-background/80 p-6 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70",
          className
        )}
      >
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  return (
    <div
      data-testid="empty-state"
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-background/80 p-6 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70",
        className
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox aria-hidden className="h-5 w-5" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
