import { useEffect, useState } from "react";
import Image from "next/image";
import { MessageCircle, PencilLine, Reply, Shield, Trash2, UserRound } from "lucide-react";
import {
  useFeedbackCommentsActions,
  useFeedbackCommentsMeta,
  useFeedbackCommentsState,
} from "@/components/feedback/detail/FeedbackCommentsProvider";
import FeedbackCommentsForm from "@/components/feedback/detail/FeedbackCommentsForm";
import FeedbackCommentsReplyItem from "@/components/feedback/detail/FeedbackCommentsReplyItem";
import {
  canDeleteFeedbackComment,
  canEditFeedbackComment,
  getFeedbackCommentRoleBadgeTone,
  getFeedbackCommentRoleLabel,
  resolveFeedbackCommentRole,
} from "@/components/feedback/detail/FeedbackCommentsUtils";
import { Button, useAlert, useConfirm } from "@/components/ui";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { isPrivateAvatarApiSrc, isSvgImageSrc } from "@/lib/avatar/path";
import { formatDateTime } from "@/lib/feedback/presentation";
import { cn } from "@/lib/shared/cn";
import type { FeedbackComment } from "@/types/feedback-comment";

type FeedbackCommentIdentity = Pick<FeedbackComment, "id" | "author_id">;

type FeedbackCommentsItemProps = {
  commentId: FeedbackComment["id"];
};

export default function FeedbackCommentsItem({ commentId }: FeedbackCommentsItemProps) {
  const { openAlert } = useAlert();
  const { openConfirm } = useConfirm();
  const stateValue = useFeedbackCommentsState();
  const metaValue = useFeedbackCommentsMeta();
  const actionsValue = useFeedbackCommentsActions();
  const { commentById, replyIdsByParentId } = stateValue;
  const { feedbackAuthorId, canWrite, currentUserId, isAdmin } = metaValue;
  const { createReply, updateComment, deleteComment } = actionsValue;
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const comment = commentById.get(commentId);
  const replies =
    replyIdsByParentId
      .get(commentId)
      ?.map((replyId) => commentById.get(replyId))
      .filter((reply): reply is FeedbackComment => Boolean(reply)) ?? [];

  useEffect(() => {
    if (!canWrite) {
      setIsReplyOpen(false);
      setEditingCommentId(null);
    }
  }, [canWrite]);

  if (!comment) {
    return null;
  }

  const commentAvatarSrc = comment.author_avatar_url ?? AVATAR_PLACEHOLDER_SRC;
  const commentRole = resolveFeedbackCommentRole({
    authorId: comment.author_id,
    feedbackAuthorId,
  });
  const canEditCurrentComment = canEditFeedbackComment({
    canWrite,
    currentUserId,
    authorId: comment.author_id,
  });
  const canDeleteCurrentComment = canDeleteFeedbackComment({
    canWrite,
    currentUserId,
    isAdmin,
    authorId: comment.author_id,
  });

  const handleToggleReply = () => {
    setEditingCommentId(null);
    setIsReplyOpen((prev) => !prev);
  };

  const handleStartEdit = ({ author_id, id }: FeedbackCommentIdentity) => {
    if (!canEditFeedbackComment({ canWrite, currentUserId, authorId: author_id })) {
      return;
    }

    if (editingCommentId === id) {
      setEditingCommentId(null);
      return;
    }

    setIsReplyOpen(false);
    setEditingCommentId(id);
  };

  const handleDelete = async (
    { author_id, id }: FeedbackCommentIdentity,
    replyLength: number
  ) => {
    if (
      !canDeleteFeedbackComment({
        canWrite,
        currentUserId,
        isAdmin,
        authorId: author_id,
      }) ||
      deletingCommentId
    ) {
      return;
    }

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

    setDeletingCommentId(id);

    try {
      await deleteComment(id);
      if (editingCommentId === id) {
        setEditingCommentId(null);
      }
      if (id === comment.id) {
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
            unoptimized={
              isSvgImageSrc(commentAvatarSrc) || isPrivateAvatarApiSrc(commentAvatarSrc)
            }
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm font-semibold text-foreground">{comment.author_name}</strong>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                getFeedbackCommentRoleBadgeTone(commentRole)
              )}
            >
              {commentRole === "admin" ? (
                <span className="inline-flex items-center gap-1">
                  <Shield className="size-3" />
                  {getFeedbackCommentRoleLabel(commentRole)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3" />
                  {getFeedbackCommentRoleLabel(commentRole)}
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(comment.created_at)}
            </span>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canWrite}
              onClick={handleToggleReply}
            >
              <Reply className="size-3.5" />
              답글 달기
            </Button>
            {canEditCurrentComment && (
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
            {canDeleteCurrentComment && (
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
            <FeedbackCommentsForm
              formId={`edit-${comment.id}`}
              label="코멘트 수정"
              placeholder="코멘트를 수정해보세요."
              submitLabel="수정 저장"
              defaultValue={comment.body}
              onSubmitText={(updatedCommentText) => updateComment(comment.id, updatedCommentText)}
              onSuccess={() => setEditingCommentId(null)}
              onCancel={() => setEditingCommentId(null)}
              className="mt-4 border border-dashed border-border/60 bg-background/80 dark:border-white/10 dark:bg-neutral-950/40"
            />
          )}

          {replies.length > 0 && (
            <div className="mt-4 space-y-3 sm:border-l sm:border-border/60 sm:pl-4 dark:sm:border-white/10">
              {replies.map((reply) => {
                return (
                  <FeedbackCommentsReplyItem
                    key={reply.id}
                    replyId={reply.id}
                    editingCommentId={editingCommentId}
                    deletingCommentId={deletingCommentId}
                    onStartEdit={handleStartEdit}
                    onCloseEdit={() => setEditingCommentId(null)}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          )}

          {isReplyOpen && (
            <FeedbackCommentsForm
              formId={`reply-${comment.id}`}
              label="답글 작성"
              placeholder="답글은 한 단계까지만 허용됩니다."
              submitLabel="답글 등록"
              onSubmitText={(replyText) => createReply(comment.id, replyText)}
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
