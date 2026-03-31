import React, { useEffect, useState } from "react";
import { Lock, MessageCircle } from "lucide-react";
import { useSession } from "@/components/session";
import { cn } from "@/lib/shared/cn";
import { getFreshAccessToken } from "@/lib/auth/client";
import {
  createFeedbackComment,
  deleteFeedbackComment,
  updateFeedbackComment,
} from "@/lib/feedback/client";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";
import type { FeedbackComment } from "@/types/feedback-comment";
import FeedbackCommentComposer from "@/components/feedback/detail/FeedbackCommentComposer";
import FeedbackCommentItem from "@/components/feedback/detail/FeedbackCommentItem";

type FeedbackCommentsSectionProps = {
  feedback: FeedbackPublicAndEmailRow;
  isAuthor: boolean;
  isAdmin: boolean;
  serverComments: FeedbackComment[];
};

export default function FeedbackCommentsSection({
  feedback,
  isAuthor,
  isAdmin,
  serverComments,
}: FeedbackCommentsSectionProps) {
  const { session, supabaseBrowserClient } = useSession();
  const [commentItems, setCommentItems] = useState<FeedbackComment[]>(serverComments);
  const currentUserId = session?.user?.id ?? null;

  useEffect(() => {
    setCommentItems(serverComments);
  }, [feedback.id, serverComments]);

  const isCommentsUnlocked = Boolean(feedback.comments_unlocked_at);
  const canWrite =
    isCommentsUnlocked &&
    feedback.status === "approved" &&
    feedback.is_public &&
    (isAuthor || isAdmin);
  const isPubliclyVisible =
    isCommentsUnlocked && feedback.status === "approved" && feedback.is_public;
  const topLevelComments = commentItems.filter((comment) => comment.parent_comment_id === null);
  const replyCount = commentItems.length - topLevelComments.length;
  const topLevelCount = topLevelComments.length;

  const resolveAccessToken = async () => {
    const accessToken = await getFreshAccessToken({
      supabaseBrowserClient,
      fallbackAccessToken: session?.access_token ?? null,
    });

    if (!accessToken) {
      throw new Error("로그인 상태를 확인해주세요.");
    }

    return accessToken;
  };

  const handleCreateComment = async (body: string) => {
    if (!canWrite) {
      throw new Error("현재 상태에서는 새 코멘트를 작성할 수 없습니다.");
    }

    const accessToken = await resolveAccessToken();
    const createdComment = await createFeedbackComment({
      feedbackId: feedback.id,
      accessToken,
      payload: {
        body,
        parentCommentId: null,
      },
    });

    setCommentItems((prev) => [...prev, createdComment]);
  };

  const handleCreateReply = async (parentCommentId: string, body: string) => {
    if (!canWrite) {
      throw new Error("현재 상태에서는 답글을 작성할 수 없습니다.");
    }

    const accessToken = await resolveAccessToken();
    const createdComment = await createFeedbackComment({
      feedbackId: feedback.id,
      accessToken,
      payload: {
        body,
        parentCommentId,
      },
    });

    setCommentItems((prev) => [...prev, createdComment]);
  };

  const handleUpdateComment = async (comment: FeedbackComment, body: string) => {
    if (!canWrite) {
      throw new Error("현재 상태에서는 코멘트를 수정할 수 없습니다.");
    }

    const accessToken = await resolveAccessToken();
    const updatedComment = await updateFeedbackComment({
      feedbackId: feedback.id,
      commentId: comment.id,
      accessToken,
      payload: { body },
    });

    setCommentItems((prev) =>
      prev.map((item) => (item.id === updatedComment.id ? updatedComment : item))
    );
  };

  const handleDeleteComment = async (comment: FeedbackComment) => {
    const accessToken = await resolveAccessToken();

    await deleteFeedbackComment({
      feedbackId: feedback.id,
      commentId: comment.id,
      accessToken,
    });

    setCommentItems((prev) =>
      prev.filter((item) => item.id !== comment.id && item.parent_comment_id !== comment.id)
    );
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
  const composerPlaceholder = canWrite
    ? "면접 흐름, 수정 포인트, 공개 보드에서 강조하고 싶은 메시지를 남겨보세요."
    : !isCommentsUnlocked
      ? "최초 승인 이후부터 코멘트를 작성할 수 있습니다."
      : "현재 상태에서는 새 코멘트를 작성할 수 없습니다.";

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comments
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">코멘트</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            승인된 공개 피드백에서는 모두가 코멘트를 읽을 수 있고, 작성은 게시물 작성자와 관리자만
            가능합니다.
          </p>
        </div>

        <div className="grid min-w-[220px] gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              전체
            </p>
            <strong className="mt-2 block text-xl font-semibold text-foreground">
              {commentItems.length}
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
          {isPubliclyVisible ? (
            <MessageCircle className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
          )}
          {isPubliclyVisible ? "전체 공개 코멘트" : "작성자 · 관리자 전용 열람"}
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
              아직 등록된 코멘트가 없습니다. 승인 상태일 때 작성자나 관리자가 첫 코멘트를 남길 수
              있습니다.
            </div>
          )}

          {isCommentsUnlocked &&
            topLevelComments.map((comment) => (
              <FeedbackCommentItem
                key={comment.id}
                comment={comment}
                replies={commentItems.filter((item) => item.parent_comment_id === comment.id)}
                feedbackAuthorId={feedback.author_id}
                canWrite={canWrite}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onReplySubmit={handleCreateReply}
                onEditSubmit={handleUpdateComment}
                onDelete={handleDeleteComment}
              />
            ))}
        </div>

        <FeedbackCommentComposer
          feedbackId={feedback.id}
          title={composerTitle}
          description={composerDescription}
          placeholder={composerPlaceholder}
          canWrite={canWrite}
          onSubmit={handleCreateComment}
        />
      </div>
    </section>
  );
}
