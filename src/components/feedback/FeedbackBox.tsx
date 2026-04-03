import { cn } from "@/lib/shared/cn";
import type { FeedbackListItem } from "@/types/feedback";
import { formatDateTime, ratingStars, statusBadge, statusLabel } from "@/lib/feedback/presentation";
import { isPrivateAvatarApiSrc, isSvgImageSrc } from "@/lib/avatar/path";
import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui";
import Link from "next/link";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { hasFeedbackBeenUpdated } from "@/lib/feedback/list";
import { MessageCircle } from "lucide-react";

type FeedbackBoxProps = {
  data: FeedbackListItem;
};

export default function FeedbackBox({ data }: FeedbackBoxProps) {
  const isPreview = data.isPreview;
  const avatarSrc = data.avatar_url || AVATAR_PLACEHOLDER_SRC;
  const hasBeenUpdated = hasFeedbackBeenUpdated(data);
  const commentCount = isPreview ? 0 : (data.comment_count ?? 0);

  return (
    <article className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(data.status)}`}
          >
            {statusLabel(data.status)}
          </span>
          <span className="text-xs text-muted-foreground">
            {hasBeenUpdated ? "마지막 수정" : "등록"} : {formatDateTime(data.updated_at)}
          </span>
        </div>
        {!isPreview && (
          <span className="text-sm font-semibold text-amber-500">{ratingStars(data.rating)}</span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
            <Image
              src={avatarSrc}
              alt={`${data.display_name} avatar`}
              width={40}
              height={40}
              unoptimized={isSvgImageSrc(avatarSrc) || isPrivateAvatarApiSrc(avatarSrc)}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-base font-semibold text-foreground">{data.display_name}</span>
          {data.is_company_public && data.company_name && (
            <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs">
              {data.company_name}
            </span>
          )}
          <span className="text-xs">수정 {data.revision_count}회</span>
        </div>
        <div
          className={cn("flex flex-col gap-3", {
            "rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4": isPreview,
          })}
        >
          <p
            className={cn("text-base text-foreground", {
              "blur-sm select-none": isPreview,
            })}
          >
            {isPreview ? "수정된 내용은 승인 후 공개됩니다." : data.summary}
          </p>
          {isPreview && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
              이미 승인된 피드백이 수정된 경우 관리자의 승인을 한번 더 받아야 공개가 됩니다.
            </p>
          )}
        </div>
        <div
          className={cn("flex flex-wrap gap-2", {
            "blur-sm select-none": isPreview,
          })}
        >
          {!isPreview &&
            data.tags.map((tag) => (
              <span
                key={`${data.id}-${tag}`}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              >
                #{tag}
              </span>
            ))}
        </div>
      </div>

      <div className={cn("mt-4 flex flex-wrap items-center gap-3 justify-between")}>
        {!isPreview && (
          <>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-neutral-900/70">
              <MessageCircle className="size-3.5" />
              댓글 {commentCount}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/feedback/${data.id}`}>상세 보기</Link>
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
