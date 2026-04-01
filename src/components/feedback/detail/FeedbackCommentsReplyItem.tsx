import { CornerDownRight, PencilLine, Trash2 } from "lucide-react";
import {
  useFeedbackCommentsActions,
  useFeedbackCommentsMeta,
  useFeedbackCommentsState,
} from "@/components/feedback/detail/FeedbackCommentsProvider";
import FeedbackCommentsForm from "@/components/feedback/detail/FeedbackCommentsForm";
import {
  canDeleteFeedbackComment,
  canEditFeedbackComment,
  getFeedbackCommentRoleBadgeTone,
  getFeedbackCommentRoleLabel,
  resolveFeedbackCommentRole,
} from "@/components/feedback/detail/FeedbackCommentsUtils";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/feedback/presentation";
import { cn } from "@/lib/shared/cn";
import type { FeedbackComment } from "@/types/feedback-comment";

type FeedbackCommentIdentity = Pick<FeedbackComment, "id" | "author_id">;

type FeedbackCommentsReplyItemProps = {
  replyId: FeedbackComment["id"];
  editingCommentId: FeedbackComment["id"] | null;
  deletingCommentId: FeedbackComment["id"] | null;
  onStartEdit: (identity: FeedbackCommentIdentity) => void;
  onCloseEdit: () => void;
  onDelete: (identity: FeedbackCommentIdentity, replyLength: number) => Promise<void>;
};

export default function FeedbackCommentsReplyItem({
  replyId,
  editingCommentId,
  deletingCommentId,
  onStartEdit,
  onCloseEdit,
  onDelete,
}: FeedbackCommentsReplyItemProps) {
  const stateValue = useFeedbackCommentsState();
  const metaValue = useFeedbackCommentsMeta();
  const actionsValue = useFeedbackCommentsActions();
  const { commentById } = stateValue;
  const { feedbackAuthorId, canWrite, currentUserId, isAdmin } = metaValue;
  const { updateComment } = actionsValue;

  const reply = commentById.get(replyId);
  if (!reply) {
    return null;
  }

  const replyRole = resolveFeedbackCommentRole({
    authorId: reply.author_id,
    feedbackAuthorId,
  });
  const canEditReply = canEditFeedbackComment({
    canWrite,
    currentUserId,
    authorId: reply.author_id,
  });
  const canDeleteReply = canDeleteFeedbackComment({
    canWrite,
    currentUserId,
    isAdmin,
    authorId: reply.author_id,
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 dark:border-white/10 dark:bg-neutral-950/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <CornerDownRight className="size-3.5" />
          답글
        </span>
        <strong className="text-sm font-semibold text-foreground">{reply.author_name}</strong>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            getFeedbackCommentRoleBadgeTone(replyRole)
          )}
        >
          {getFeedbackCommentRoleLabel(replyRole)}
        </span>
        <span className="text-xs text-muted-foreground">{formatDateTime(reply.created_at)}</span>
        {reply.edited_at && <span className="text-xs text-muted-foreground">수정됨</span>}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {reply.body}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canEditReply && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={Boolean(deletingCommentId)}
            onClick={() => onStartEdit(reply)}
          >
            <PencilLine className="size-3.5" />
            수정
          </Button>
        )}
        {canDeleteReply && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={Boolean(deletingCommentId)}
            onClick={() => void onDelete(reply, 0)}
          >
            <Trash2 className="size-3.5" />
            삭제
          </Button>
        )}
      </div>

      {editingCommentId === reply.id && (
        <FeedbackCommentsForm
          formId={`edit-${reply.id}`}
          label="답글 수정"
          placeholder="답글을 수정해보세요."
          submitLabel="수정 저장"
          defaultValue={reply.body}
          onSubmitText={(updatedCommentText) => updateComment(reply.id, updatedCommentText)}
          onSuccess={onCloseEdit}
          onCancel={onCloseEdit}
          className="mt-3 border border-dashed border-border/60 bg-white/70 dark:border-white/10 dark:bg-neutral-900/60"
          minHeightClassName="min-h-[110px]"
        />
      )}
    </div>
  );
}
