import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";
import { formatDateTime, ratingStars, statusBadge, statusLabel } from "@/lib/feedback/presentation";
import { checkAvatarApiSrcPrivate, checkSvgImageSrc } from "@/lib/avatar/path";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { checkUpdateData } from "@/lib/feedback/list";
import { ReviewFeedbackResult } from "@/lib/feedback/client";
import { ReviewActionButtons } from "../common";

type AdminFeedbackBoxProps = {
  data: FeedbackPublicAndEmailRow;
  onReviewed: (result: ReviewFeedbackResult) => void;
};
export default function AdminFeedbackBox({ data, onReviewed }: AdminFeedbackBoxProps) {
  const avatarSrc = data.avatar_url || AVATAR_PLACEHOLDER_SRC;
  const isUpdateData = checkUpdateData(data);

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
            {isUpdateData ? "마지막 수정" : "등록"} : {formatDateTime(data.updated_at)}
          </span>
        </div>
        <span className="text-sm font-semibold text-amber-500">{ratingStars(data.rating)}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
            <Image
              src={avatarSrc}
              alt={`${data.display_name} avatar`}
              width={40}
              height={40}
              unoptimized={checkSvgImageSrc(avatarSrc) || checkAvatarApiSrcPrivate(avatarSrc)}
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
        <p className="text-sm text-muted-foreground">작성자 이메일: {data.email ?? "-"}</p>
        <p className="text-base text-foreground">{data.summary}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/feedback/${data.id}`}>상세 보기</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm">
            삭제
          </Button>
          {(data.status === "pending" || data.status === "revised_pending") && (
            <ReviewActionButtons id={data.id} size="sm" onSuccess={onReviewed} />
          )}
        </div>
      </div>
    </article>
  );
}
