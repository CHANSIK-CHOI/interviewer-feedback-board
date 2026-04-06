import type { FeedbackCommentRow } from "@/types/feedback-comment";
import type { FeedbackPublicBase } from "@/types/feedback";
import type { NotificationRow, NotificationType } from "@/types/notification";

export type BuildNotificationContentParams = {
  type: NotificationType;
  feedbackId: FeedbackPublicBase["id"];
  actorName?: string | null;
  feedbackDisplayName?: string | null;
  commentId?: FeedbackCommentRow["id"] | null;
};

export type NotificationContent = Pick<NotificationRow, "type" | "title" | "body" | "link">;

function resolveActorLabel(actorName?: string | null) {
  const trimmedActorName = actorName?.trim();
  return trimmedActorName ? `${trimmedActorName} 님` : "누군가";
}

function resolveFeedbackLabel(feedbackDisplayName?: string | null) {
  const trimmedFeedbackDisplayName = feedbackDisplayName?.trim();
  return trimmedFeedbackDisplayName ? `"${trimmedFeedbackDisplayName}" 피드백` : "피드백";
}

function buildFeedbackLink({
  feedbackId,
  commentId,
}: {
  feedbackId: FeedbackPublicBase["id"];
  commentId?: FeedbackCommentRow["id"] | null;
}) {
  const feedbackLink = `/feedback/${feedbackId}`;
  return commentId ? `${feedbackLink}?commentId=${commentId}` : feedbackLink;
}

export function buildNotificationContent({
  type,
  feedbackId,
  actorName,
  feedbackDisplayName,
  commentId,
}: BuildNotificationContentParams): NotificationContent {
  const actorLabel = resolveActorLabel(actorName);
  const feedbackLabel = resolveFeedbackLabel(feedbackDisplayName);

  switch (type) {
    case "feedback_submitted":
      return {
        type,
        title: "새 피드백 승인 요청",
        body: `${actorLabel} ${feedbackLabel}를 등록했습니다.`,
        link: "/admin/feedback",
      };
    case "feedback_resubmitted":
      return {
        type,
        title: "피드백 재승인 요청",
        body: `${actorLabel} ${feedbackLabel}를 수정해 다시 검토를 요청했습니다.`,
        link: "/admin/feedback",
      };
    case "feedback_approved":
      return {
        type,
        title: "피드백이 승인되었어요",
        body: `작성한 ${feedbackLabel}가 승인되어 공개 보드에 표시됩니다.`,
        link: buildFeedbackLink({ feedbackId }),
      };
    case "feedback_rejected":
      return {
        type,
        title: "피드백이 반려되었어요",
        body: `작성한 ${feedbackLabel}가 반려되었습니다. 내용을 확인한 뒤 다시 수정해 주세요.`,
        link: buildFeedbackLink({ feedbackId }),
      };
    case "feedback_comment":
      return {
        type,
        title: "새 코멘트가 도착했어요",
        body: `${actorLabel} ${feedbackLabel}에 코멘트를 남겼습니다.`,
        link: buildFeedbackLink({ feedbackId, commentId }),
      };
    case "feedback_reply":
      return {
        type,
        title: "내 코멘트에 답글이 달렸어요",
        body: `${actorLabel} 코멘트에 답글을 남겼습니다.`,
        link: buildFeedbackLink({ feedbackId, commentId }),
      };
  }
}
