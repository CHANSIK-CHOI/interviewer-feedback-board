import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  CornerDownRight,
  MessageCircle,
  PencilLine,
  Reply,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button, useAlert, useConfirm } from "@/components/ui";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { checkAvatarApiSrcPrivate, checkSvgImageSrc } from "@/lib/avatar/path";
import { formatDateTime } from "@/lib/feedback/presentation";
import { cn } from "@/lib/shared/cn";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";
import type { FeedbackComment, FeedbackCommentRole } from "@/types/feedback-comment";
import FeedbackCommentForm from "@/components/feedback/detail/FeedbackCommentForm";

type FeedbackCommentItemProps = {
  comment: FeedbackComment;
  replies: FeedbackComment[];
  feedbackAuthorId: FeedbackPublicAndEmailRow["author_id"];
  canWrite: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
  onReplySubmit: (parentCommentId: string, body: string) => Promise<void>;
  onEditSubmit: (comment: FeedbackComment, body: string) => Promise<void>;
  onDelete: (comment: FeedbackComment) => Promise<void>;
};

const getRoleLabel = (role: FeedbackCommentRole) => {
  return role === "admin" ? "관리자" : "작성자";
};

const getRoleBadgeTone = (role: FeedbackCommentRole) => {
  return role === "admin"
    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
    : "bg-blue-500/12 text-blue-700 dark:text-blue-300";
};

export default function FeedbackCommentItem({
  comment,
  replies,
  feedbackAuthorId,
  canWrite,
  isAdmin,
  currentUserId,
  onReplySubmit,
  onEditSubmit,
  onDelete,
}: FeedbackCommentItemProps) {
  const { openAlert } = useAlert();
  const { openConfirm } = useConfirm();
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (!canWrite) {
      setIsReplyOpen(false);
      setEditingCommentId(null);
    }
  }, [canWrite]);

  const getCommentRole = (commentItem: FeedbackComment): FeedbackCommentRole => {
    return commentItem.author_id === feedbackAuthorId ? "author" : "admin";
  };

  const canEditComment = (commentItem: FeedbackComment) => {
    return canWrite && currentUserId === commentItem.author_id;
  };

  const canDeleteComment = (commentItem: FeedbackComment) => {
    return isAdmin || (canWrite && currentUserId === commentItem.author_id);
  };

  const commentAvatarSrc = comment.author_avatar_url ?? AVATAR_PLACEHOLDER_SRC;
  const commentRole = getCommentRole(comment);

  const handleToggleReply = () => {
    setEditingCommentId(null);
    setIsReplyOpen((prev) => !prev);
  };

  const handleStartEdit = (commentItem: FeedbackComment) => {
    if (!canEditComment(commentItem)) return;
    setIsReplyOpen(false);
    setEditingCommentId(commentItem.id);
  };

  const handleDelete = async (commentItem: FeedbackComment, replyLength: number) => {
    if (!canDeleteComment(commentItem) || deletingCommentId) return;

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

    setDeletingCommentId(commentItem.id);

    try {
      await onDelete(commentItem);
      if (editingCommentId === commentItem.id) {
        setEditingCommentId(null);
      }
      if (commentItem.id === comment.id) {
        setIsReplyOpen(false);
      }
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "코멘트 삭제에 실패했습니다.",
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <article className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
          <Image
            src={commentAvatarSrc}
            alt={`${comment.author_name} avatar`}
            width={44}
            height={44}
            unoptimized={checkSvgImageSrc(commentAvatarSrc) || checkAvatarApiSrcPrivate(commentAvatarSrc)}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm font-semibold text-foreground">{comment.author_name}</strong>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                getRoleBadgeTone(commentRole)
              )}
            >
              {commentRole === "admin" ? (
                <span className="inline-flex items-center gap-1">
                  <Shield className="size-3" />
                  {getRoleLabel(commentRole)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3" />
                  {getRoleLabel(commentRole)}
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
            {comment.edited_at && <span className="text-xs text-muted-foreground">수정됨</span>}
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {comment.body}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" />
              답글 {replies.length}개
            </span>
            <Button type="button" variant="ghost" size="sm" disabled={!canWrite} onClick={handleToggleReply}>
              <Reply className="size-3.5" />
              답글 달기
            </Button>
            {canEditComment(comment) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={Boolean(deletingCommentId)}
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
                disabled={Boolean(deletingCommentId)}
                onClick={() => void handleDelete(comment, replies.length)}
              >
                <Trash2 className="size-3.5" />
                삭제
              </Button>
            )}
          </div>

          {editingCommentId === comment.id && (
            <FeedbackCommentForm
              formId={`edit-${comment.id}`}
              label="코멘트 수정"
              placeholder="코멘트를 수정해보세요."
              submitLabel="수정 저장"
              defaultValue={comment.body}
              onSubmit={(body) => onEditSubmit(comment, body)}
              onSuccess={() => setEditingCommentId(null)}
              onCancel={() => setEditingCommentId(null)}
              className="mt-4 border border-dashed border-border/60 bg-background/80 dark:border-white/10 dark:bg-neutral-950/40"
            />
          )}

          {replies.length > 0 && (
            <div className="mt-4 space-y-3 sm:border-l sm:border-border/60 sm:pl-4 dark:sm:border-white/10">
              {replies.map((reply) => {
                const replyRole = getCommentRole(reply);

                return (
                  <div
                    key={reply.id}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4 dark:border-white/10 dark:bg-neutral-950/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <CornerDownRight className="size-3.5" />
                        답글
                      </span>
                      <strong className="text-sm font-semibold text-foreground">{reply.author_name}</strong>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          getRoleBadgeTone(replyRole)
                        )}
                      >
                        {getRoleLabel(replyRole)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(reply.created_at)}
                      </span>
                      {reply.edited_at && (
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
                          disabled={Boolean(deletingCommentId)}
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
                          disabled={Boolean(deletingCommentId)}
                          onClick={() => void handleDelete(reply, 0)}
                        >
                          <Trash2 className="size-3.5" />
                          삭제
                        </Button>
                      )}
                    </div>

                    {editingCommentId === reply.id && (
                      <FeedbackCommentForm
                        formId={`edit-${reply.id}`}
                        label="답글 수정"
                        placeholder="답글을 수정해보세요."
                        submitLabel="수정 저장"
                        defaultValue={reply.body}
                        onSubmit={(body) => onEditSubmit(reply, body)}
                        onSuccess={() => setEditingCommentId(null)}
                        onCancel={() => setEditingCommentId(null)}
                        className="mt-3 border border-dashed border-border/60 bg-white/70 dark:border-white/10 dark:bg-neutral-900/60"
                        minHeightClassName="min-h-[110px]"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isReplyOpen && (
            <FeedbackCommentForm
              formId={`reply-${comment.id}`}
              label="답글 작성"
              placeholder="답글은 한 단계까지만 허용됩니다."
              submitLabel="답글 등록"
              onSubmit={(body) => onReplySubmit(comment.id, body)}
              onSuccess={() => setIsReplyOpen(false)}
              onCancel={() => setIsReplyOpen(false)}
              cancelLabel="닫기"
              disabled={!canWrite || Boolean(deletingCommentId)}
              className="mt-4 border border-dashed border-border/60 bg-background/80 dark:border-white/10 dark:bg-neutral-950/40"
              minHeightClassName="min-h-[110px]"
            />
          )}
        </div>
      </div>
    </article>
  );
}
