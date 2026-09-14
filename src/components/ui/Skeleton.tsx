import { cn } from "@/lib/shared/cn";
import React from "react";

export type SkeletonProps = React.ComponentProps<"div">;

/**
 * 로딩 자리를 채우는 기본 블록.
 * 스스로는 의미가 없으므로 aria-hidden 이며,
 * 감싸는 쪽에서 role="status" 로 로딩 중임을 알린다.
 */
export default function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      data-testid="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
