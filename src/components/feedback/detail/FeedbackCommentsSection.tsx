import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CornerDownRight, Lock, MessageCircle, Reply, SendHorizontal, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui";
import { AVATAR_PLACEHOLDER_SRC, inputBaseStyle } from "@/constants";
import { checkAvatarApiSrcPrivate, checkSvgImageSrc } from "@/lib/avatar/path";
import { buildMockFeedbackComments, type FeedbackCommentPreview } from "@/lib/feedback/comment-ui";
import { formatDateTime } from "@/lib/feedback/presentation";
import { cn } from "@/lib/shared/cn";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";

type FeedbackCommentsSectionProps = {
  feedback: FeedbackPublicAndEmailRow;
  reviewerName: string | null;
  isAuthor: boolean;
  isAdmin: boolean;
};

const getRoleLabel = (role: FeedbackCommentPreview["role"]) => {
  return role === "admin" ? "관리자" : "작성자";
};

const getRoleBadgeTone = (role: FeedbackCommentPreview["role"]) => {
  return role === "admin"
    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
    : "bg-blue-500/12 text-blue-700 dark:text-blue-300";
};

const buildCurrentCommenter = ({
  feedback,
  isAuthor,
  isAdmin,
}: {
  feedback: FeedbackPublicAndEmailRow;
  isAuthor: boolean;
  isAdmin: boolean;
}) => {
  if (isAdmin && !isAuthor) {
    return {
      name: "관리자",
      role: "admin" as const,
      avatarUrl: AVATAR_PLACEHOLDER_SRC,
    };
  }

  return {
    name: feedback.display_name,
    role: "author" as const,
    avatarUrl: feedback.avatar_url || AVATAR_PLACEHOLDER_SRC,
  };
};

export default function FeedbackCommentsSection({
  feedback,
  reviewerName,
  isAuthor,
  isAdmin,
}: FeedbackCommentsSectionProps) {
  const initialComments = useMemo(
    () =>
      buildMockFeedbackComments({
        feedbackId: feedback.id,
        createdAt: feedback.created_at,
        authorName: feedback.display_name,
        authorAvatarUrl: feedback.avatar_url,
        adminName: reviewerName,
      }),
    [feedback.id, feedback.created_at, feedback.display_name, feedback.avatar_url, reviewerName]
  );

  const [comments, setComments] = useState<FeedbackCommentPreview[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  useEffect(() => {
    setComments(initialComments);
    setDraft("");
    setReplyTargetId(null);
    setReplyDraft("");
  }, [feedback.id, initialComments]);

  const canWrite = feedback.status === "approved" && feedback.is_public && (isAuthor || isAdmin);
  const isPubliclyVisible = feedback.status === "approved" && feedback.is_public;
  const currentCommenter = buildCurrentCommenter({ feedback, isAuthor, isAdmin });
  const topLevelComments = comments.filter((comment) => comment.parentCommentId === null);
  const replyCount = comments.length - topLevelComments.length;
  const topLevelCount = topLevelComments.length;

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBody = draft.trim();
    if (!canWrite || !nextBody) return;

    setComments((prev) => [
      ...prev,
      {
        id: `local-comment-${prev.length + 1}`,
        parentCommentId: null,
        authorName: currentCommenter.name,
        authorAvatarUrl: currentCommenter.avatarUrl,
        role: currentCommenter.role,
        body: nextBody,
        createdAt: new Date().toISOString(),
        editedAt: null,
      },
    ]);
    setDraft("");
  };

  const handleSubmitReply = (event: FormEvent<HTMLFormElement>, parentCommentId: string) => {
    event.preventDefault();
    const nextBody = replyDraft.trim();
    if (!canWrite || !nextBody) return;

    setComments((prev) => [
      ...prev,
      {
        id: `local-reply-${parentCommentId}-${prev.length + 1}`,
        parentCommentId,
        authorName: currentCommenter.name,
        authorAvatarUrl: currentCommenter.avatarUrl,
        role: currentCommenter.role,
        body: nextBody,
        createdAt: new Date().toISOString(),
        editedAt: null,
      },
    ]);
    setReplyDraft("");
    setReplyTargetId(null);
  };

  const composerTitle = canWrite ? "코멘트 남기기" : "코멘트 작성 정책";
  const composerDescription = canWrite
    ? "현재는 승인된 공개 상태이므로 작성자와 관리자만 코멘트를 남길 수 있습니다."
    : isAuthor || isAdmin
      ? "현재는 비공개 상태라 새 코멘트 작성이 잠겨 있습니다. 다시 승인되면 이어서 작성할 수 있습니다."
      : "코멘트는 누구나 읽을 수 있지만, 작성은 게시물 작성자와 관리자만 가능합니다.";

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comments
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">코멘트</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            승인된 공개 피드백에서는 모두가 코멘트를 읽을 수 있고, 작성은 게시물 작성자와
            관리자만 가능합니다. 비공개 상태로 돌아가면 기존 코멘트는 작성자와 관리자에게만
            계속 보입니다.
          </p>
        </div>

        <div className="grid min-w-[220px] gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              전체
            </p>
            <strong className="mt-2 block text-xl font-semibold text-foreground">
              {comments.length}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              댓글
            </p>
            <strong className="mt-2 block text-xl font-semibold text-foreground">
              {topLevelCount}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              답글
            </p>
            <strong className="mt-2 block text-xl font-semibold text-foreground">
              {replyCount}
            </strong>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
            isPubliclyVisible
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-500/12 text-slate-700 dark:text-slate-300"
          )}
        >
          {isPubliclyVisible ? <MessageCircle className="size-3.5" /> : <Lock className="size-3.5" />}
          {isPubliclyVisible ? "전체 공개 코멘트" : "작성자 · 관리자 전용 열람"}
        </span>
        <span className="text-xs text-muted-foreground">
          답글은 1단계까지만 허용하는 구조로 퍼블리싱했습니다.
        </span>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {topLevelComments.map((comment) => {
            const replies = comments.filter((item) => item.parentCommentId === comment.id);

            return (
              <article
                key={comment.id}
                className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                    <Image
                      src={comment.authorAvatarUrl || AVATAR_PLACEHOLDER_SRC}
                      alt={`${comment.authorName} avatar`}
                      width={44}
                      height={44}
                      unoptimized={
                        checkSvgImageSrc(comment.authorAvatarUrl) ||
                        checkAvatarApiSrcPrivate(comment.authorAvatarUrl)
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-semibold text-foreground">
                        {comment.authorName}
                      </strong>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          getRoleBadgeTone(comment.role)
                        )}
                      >
                        {comment.role === "admin" ? (
                          <span className="inline-flex items-center gap-1">
                            <Shield className="size-3" />
                            {getRoleLabel(comment.role)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3" />
                            {getRoleLabel(comment.role)}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                      </span>
                      {comment.editedAt && (
                        <span className="text-xs text-muted-foreground">수정됨</span>
                      )}
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {comment.body}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="size-3.5" />
                        답글 {replies.length}개
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!canWrite}
                        onClick={() => {
                          setReplyTargetId((prev) => (prev === comment.id ? null : comment.id));
                          setReplyDraft("");
                        }}
                      >
                        <Reply className="size-3.5" />
                        답글 달기
                      </Button>
                    </div>

                    {replies.length > 0 && (
                      <div className="mt-4 space-y-3 border-l border-border/60 pl-4 dark:border-white/10">
                        {replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-2xl border border-border/60 bg-background/80 p-4 dark:border-white/10 dark:bg-neutral-950/40"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <CornerDownRight className="size-3.5" />
                                답글
                              </span>
                              <strong className="text-sm font-semibold text-foreground">
                                {reply.authorName}
                              </strong>
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                  getRoleBadgeTone(reply.role)
                                )}
                              >
                                {getRoleLabel(reply.role)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(reply.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                              {reply.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyTargetId === comment.id && (
                      <form
                        onSubmit={(event) => handleSubmitReply(event, comment.id)}
                        className="mt-4 rounded-2xl border border-dashed border-border/60 bg-background/80 p-4 dark:border-white/10 dark:bg-neutral-950/40"
                      >
                        <label
                          htmlFor={`reply-${comment.id}`}
                          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          답글 작성
                        </label>
                        <textarea
                          id={`reply-${comment.id}`}
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder="답글은 한 단계까지만 허용됩니다."
                          className={`${inputBaseStyle} mt-3 min-h-[110px] resize-none`}
                          maxLength={1000}
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground">
                            {replyDraft.trim().length}/1000자
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyTargetId(null);
                                setReplyDraft("");
                              }}
                            >
                              닫기
                            </Button>
                            <Button type="submit" size="sm" disabled={!replyDraft.trim()}>
                              <SendHorizontal className="size-3.5" />
                              답글 등록
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Composer
          </p>
          <h4 className="mt-2 text-lg font-semibold text-foreground">{composerTitle}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{composerDescription}</p>

          <form onSubmit={handleSubmitComment} className="mt-5">
            <label
              htmlFor="feedback-comment-draft"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              새 코멘트
            </label>
            <textarea
              id="feedback-comment-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                canWrite
                  ? "면접 흐름, 수정 포인트, 공개 보드에서 강조하고 싶은 메시지를 남겨보세요."
                  : "현재 상태에서는 새 코멘트를 작성할 수 없습니다."
              }
              className={`${inputBaseStyle} mt-3 min-h-[160px] resize-none`}
              maxLength={1000}
              disabled={!canWrite}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{draft.trim().length}/1000자</p>
              <Button type="submit" disabled={!canWrite || !draft.trim()}>
                <SendHorizontal className="size-4" />
                코멘트 등록
              </Button>
            </div>
          </form>

          <div className="mt-5 rounded-2xl border border-dashed border-border/60 bg-background/80 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-neutral-950/40">
            <p className="font-semibold text-foreground">UI 메모</p>
            <p className="mt-2 leading-6">
              현재는 퍼블리싱 단계라 저장 없이 화면 상호작용만 제공됩니다. API 연결 후에는 동일한
              레이아웃으로 실제 코멘트 데이터만 교체하면 됩니다.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
