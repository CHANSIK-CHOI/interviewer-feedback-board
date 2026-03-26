import React, { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  CornerDownRight,
  Lock,
  MessageCircle,
  PencilLine,
  Reply,
  SendHorizontal,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useSession } from "@/components/session";
import { Button, useAlert, useConfirm } from "@/components/ui";
import { AVATAR_PLACEHOLDER_SRC, inputBaseStyle } from "@/constants";
import { checkAvatarApiSrcPrivate, checkSvgImageSrc } from "@/lib/avatar/path";
import { getFreshAccessToken } from "@/lib/auth/client";
import {
  createFeedbackComment,
  deleteFeedbackComment,
  updateFeedbackComment,
} from "@/lib/feedback/client";
import { formatDateTime } from "@/lib/feedback/presentation";
import { cn } from "@/lib/shared/cn";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";
import type { FeedbackComment } from "@/types/feedback-comment";

type FeedbackCommentsSectionProps = {
  feedback: FeedbackPublicAndEmailRow;
  isAuthor: boolean;
  isAdmin: boolean;
  initialComments: FeedbackComment[];
};

const getRoleLabel = (role: FeedbackComment["role"]) => {
  return role === "admin" ? "관리자" : "작성자";
};

const getRoleBadgeTone = (role: FeedbackComment["role"]) => {
  return role === "admin"
    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
    : "bg-blue-500/12 text-blue-700 dark:text-blue-300";
};

export default function FeedbackCommentsSection({
  feedback,
  isAuthor,
  isAdmin,
  initialComments,
}: FeedbackCommentsSectionProps) {
  const { session, supabaseBrowserClient } = useSession();
  const { openAlert } = useAlert();
  const { openConfirm } = useConfirm();
  const [comments, setComments] = useState<FeedbackComment[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUserId = session?.user?.id ?? null;

  useEffect(() => {
    setComments(initialComments);
    setDraft("");
    setReplyTargetId(null);
    setReplyDraft("");
    setEditingCommentId(null);
    setEditDraft("");
  }, [feedback.id, initialComments]);

  useEffect(() => {
    if (!isSubmitting && (feedback.status !== "approved" || !feedback.is_public)) {
      setReplyTargetId(null);
      setReplyDraft("");
      setEditingCommentId(null);
      setEditDraft("");
    }
  }, [feedback.status, feedback.is_public, isSubmitting]);

  const isCommentsUnlocked = Boolean(feedback.comments_unlocked_at);
  const canWrite =
    isCommentsUnlocked && feedback.status === "approved" && feedback.is_public && (isAuthor || isAdmin);
  const isPubliclyVisible = isCommentsUnlocked && feedback.status === "approved" && feedback.is_public;
  const topLevelComments = comments.filter((comment) => comment.parentCommentId === null);
  const replyCount = comments.length - topLevelComments.length;
  const topLevelCount = topLevelComments.length;

  const canEditComment = (comment: FeedbackComment) => {
    return canWrite && currentUserId === comment.authorId;
  };

  const canDeleteComment = (comment: FeedbackComment) => {
    return isAdmin || (canWrite && currentUserId === comment.authorId);
  };

  const resolveAccessToken = async () => {
    const accessToken = await getFreshAccessToken({
      supabaseBrowserClient,
      fallbackAccessToken: session?.access_token ?? null,
    });

    if (!accessToken) {
      openAlert({
        description: "로그인 상태를 확인해주세요.",
      });
      return null;
    }

    return accessToken;
  };

  const submitComment = async ({
    body,
    parentCommentId,
  }: {
    body: string;
    parentCommentId?: string | null;
  }) => {
    if (!canWrite || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        return;
      }

      const createdComment = await createFeedbackComment({
        feedbackId: feedback.id,
        accessToken,
        payload: {
          body,
          parentCommentId,
        },
      });

      setComments((prev) => [...prev, createdComment]);

      if (parentCommentId) {
        setReplyDraft("");
        setReplyTargetId(null);
      } else {
        setDraft("");
      }
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "코멘트 등록에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (comment: FeedbackComment) => {
    if (!canEditComment(comment) || isSubmitting) return;

    setReplyTargetId(null);
    setReplyDraft("");
    setEditingCommentId(comment.id);
    setEditDraft(comment.body);
  };

  const handleCancelEdit = () => {
    if (isSubmitting) return;
    setEditingCommentId(null);
    setEditDraft("");
  };

  const handleSubmitEdit = async (
    event: FormEvent<HTMLFormElement>,
    comment: FeedbackComment
  ) => {
    event.preventDefault();

    const body = editDraft.trim();
    if (!canEditComment(comment) || !body || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        return;
      }

      const updatedComment = await updateFeedbackComment({
        feedbackId: feedback.id,
        commentId: comment.id,
        accessToken,
        payload: { body },
      });

      setComments((prev) => prev.map((item) => (item.id === updatedComment.id ? updatedComment : item)));
      setEditingCommentId(null);
      setEditDraft("");
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "코멘트 수정에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (comment: FeedbackComment, replyLength: number) => {
    if (!canDeleteComment(comment) || isSubmitting) return;

    const isConfirmed = await openConfirm({
      title: "코멘트 삭제 확인",
      description:
        replyLength > 0
          ? `이 코멘트를 삭제하면 답글 ${replyLength}개도 함께 삭제됩니다.\n정말 삭제하시겠어요?`
          : "삭제한 코멘트는 복구할 수 없습니다.\n정말 삭제하시겠어요?",
      actionText: "삭제",
      cancelText: "취소",
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);

    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        return;
      }

      await deleteFeedbackComment({
        feedbackId: feedback.id,
        commentId: comment.id,
        accessToken,
      });

      const deletedIds = new Set([
        comment.id,
        ...comments.filter((item) => item.parentCommentId === comment.id).map((item) => item.id),
      ]);

      setComments((prev) =>
        prev.filter((item) => item.id !== comment.id && item.parentCommentId !== comment.id)
      );

      if (replyTargetId && deletedIds.has(replyTargetId)) {
        setReplyTargetId(null);
        setReplyDraft("");
      }

      if (editingCommentId && deletedIds.has(editingCommentId)) {
        setEditingCommentId(null);
        setEditDraft("");
      }
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "코멘트 삭제에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBody = draft.trim();
    if (!canWrite || !nextBody) return;

    void submitComment({ body: nextBody, parentCommentId: null });
  };

  const handleSubmitReply = (event: FormEvent<HTMLFormElement>, parentCommentId: string) => {
    event.preventDefault();
    const nextBody = replyDraft.trim();
    if (!canWrite || !nextBody) return;

    void submitComment({ body: nextBody, parentCommentId });
  };

  const composerTitle = !isCommentsUnlocked
    ? "코멘트 잠금 전"
    : canWrite
      ? "코멘트 남기기"
      : "코멘트 작성 정책";
  const composerDescription = !isCommentsUnlocked
    ? "이 게시물은 아직 최초 승인 전이라 코멘트가 열리지 않았습니다. 첫 승인 이후부터 기존 코멘트가 유지됩니다."
    : canWrite
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
          {!isCommentsUnlocked && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 p-6 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              최초 승인 이후부터 코멘트 스레드가 열립니다.
            </div>
          )}

          {isCommentsUnlocked && topLevelComments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 p-6 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              아직 등록된 코멘트가 없습니다. 승인 상태일 때 작성자나 관리자가 첫 코멘트를 남길 수 있습니다.
            </div>
          )}

          {isCommentsUnlocked &&
            topLevelComments.map((comment) => {
              const replies = comments.filter((item) => item.parentCommentId === comment.id);
              const commentAvatarSrc = comment.authorAvatarUrl ?? AVATAR_PLACEHOLDER_SRC;

              return (
                <article
                  key={comment.id}
                  className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                      <Image
                        src={commentAvatarSrc}
                        alt={`${comment.authorName} avatar`}
                        width={44}
                        height={44}
                        unoptimized={
                          checkSvgImageSrc(commentAvatarSrc) ||
                          checkAvatarApiSrcPrivate(commentAvatarSrc)
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
                          disabled={!canWrite || isSubmitting}
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditDraft("");
                            setReplyTargetId((prev) => (prev === comment.id ? null : comment.id));
                            setReplyDraft("");
                          }}
                        >
                          <Reply className="size-3.5" />
                          답글 달기
                        </Button>
                        {canEditComment(comment) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleStartEdit(comment)}
                          >
                            <PencilLine className="size-3.5" />
                            수정
                          </Button>
                        )}
                        {canDeleteComment(comment) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => void handleDeleteComment(comment, replies.length)}
                          >
                            <Trash2 className="size-3.5" />
                            삭제
                          </Button>
                        )}
                      </div>

                      {editingCommentId === comment.id && (
                        <form
                          onSubmit={(event) => void handleSubmitEdit(event, comment)}
                          className="mt-4 rounded-2xl border border-dashed border-border/60 bg-background/80 p-4 dark:border-white/10 dark:bg-neutral-950/40"
                        >
                          <label
                            htmlFor={`edit-${comment.id}`}
                            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            코멘트 수정
                          </label>
                          <textarea
                            id={`edit-${comment.id}`}
                            value={editDraft}
                            onChange={(event) => setEditDraft(event.target.value)}
                            className={`${inputBaseStyle} mt-3 min-h-[120px] resize-none`}
                            maxLength={1000}
                          />
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">{editDraft.trim().length}/1000자</p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={handleCancelEdit}
                              >
                                <X className="size-3.5" />
                                취소
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || !editDraft.trim()}
                              >
                                <SendHorizontal className="size-3.5" />
                                수정 저장
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}

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
                                {reply.editedAt && (
                                  <span className="text-xs text-muted-foreground">수정됨</span>
                                )}
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                {reply.body}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {canEditComment(reply) && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={() => handleStartEdit(reply)}
                                  >
                                    <PencilLine className="size-3.5" />
                                    수정
                                  </Button>
                                )}
                                {canDeleteComment(reply) && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={() => void handleDeleteComment(reply, 0)}
                                  >
                                    <Trash2 className="size-3.5" />
                                    삭제
                                  </Button>
                                )}
                              </div>

                              {editingCommentId === reply.id && (
                                <form
                                  onSubmit={(event) => void handleSubmitEdit(event, reply)}
                                  className="mt-3 rounded-2xl border border-dashed border-border/60 bg-white/70 p-4 dark:border-white/10 dark:bg-neutral-900/60"
                                >
                                  <label
                                    htmlFor={`edit-${reply.id}`}
                                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                  >
                                    답글 수정
                                  </label>
                                  <textarea
                                    id={`edit-${reply.id}`}
                                    value={editDraft}
                                    onChange={(event) => setEditDraft(event.target.value)}
                                    className={`${inputBaseStyle} mt-3 min-h-[110px] resize-none`}
                                    maxLength={1000}
                                  />
                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">
                                      {editDraft.trim().length}/1000자
                                    </p>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isSubmitting}
                                        onClick={handleCancelEdit}
                                      >
                                        <X className="size-3.5" />
                                        취소
                                      </Button>
                                      <Button
                                        type="submit"
                                        size="sm"
                                        disabled={isSubmitting || !editDraft.trim()}
                                      >
                                        <SendHorizontal className="size-3.5" />
                                        수정 저장
                                      </Button>
                                    </div>
                                  </div>
                                </form>
                              )}
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
                                disabled={isSubmitting}
                                onClick={() => {
                                  setReplyTargetId(null);
                                  setReplyDraft("");
                                }}
                              >
                                닫기
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || !replyDraft.trim()}
                              >
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
                  : !isCommentsUnlocked
                    ? "최초 승인 이후부터 코멘트를 작성할 수 있습니다."
                    : "현재 상태에서는 새 코멘트를 작성할 수 없습니다."
              }
              className={`${inputBaseStyle} mt-3 min-h-[160px] resize-none`}
              maxLength={1000}
              disabled={!canWrite}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{draft.trim().length}/1000자</p>
              <Button type="submit" disabled={isSubmitting || !canWrite || !draft.trim()}>
                <SendHorizontal className="size-4" />
                코멘트 등록
              </Button>
            </div>
          </form>

          <div className="mt-5 rounded-2xl border border-dashed border-border/60 bg-background/80 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-neutral-950/40">
            <p className="font-semibold text-foreground">UI 메모</p>
            <p className="mt-2 leading-6">
              코멘트 등록, 1단계 답글, 본인 코멘트 수정, 본인 또는 관리자 삭제까지 실제 API에
              연결되어 있습니다.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
