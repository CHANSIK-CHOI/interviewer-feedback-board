import type { FeedbackPublicRow } from "@/types/feedback";
import type { FeedbackCommentRow } from "@/types/feedback-comment";
import type { NotificationRow, NotificationType } from "@/types/notification";
import { getAuthUserNameById } from "../user/profile.server";

export type BuildNotificationContentParams = {
  type: NotificationType;
  feedback_id: NonNullable<NotificationRow["feedback_id"]>;
  recipient_user_id: NonNullable<NotificationRow["recipient_user_id"]>;
  actor_user_id: NonNullable<NotificationRow["actor_user_id"]>;
  feedback_summary?: FeedbackPublicRow["summary"];
  comment_id?: FeedbackCommentRow["id"];
};

export type NotificationContent = Pick<
  NotificationRow,
  | "type"
  | "title"
  | "body"
  | "link"
  | "feedback_id"
  | "comment_id"
  | "actor_user_id"
  | "is_read"
  | "recipient_user_id"
>;

function resolveFeedbackSummary(feedbackDisplayName?: string | null) {
  const trimmedFeedbackDisplayName = feedbackDisplayName?.trim();

  if (!trimmedFeedbackDisplayName) return "피드백";

  const slicedFeedbackDisplayName = trimmedFeedbackDisplayName.slice(0, 10);

  return trimmedFeedbackDisplayName.length > 10
    ? `"${slicedFeedbackDisplayName}..." 피드백`
    : `"${trimmedFeedbackDisplayName}" 피드백`;
}

function buildFeedbackLink({
  feedback_id,
  comment_id,
}: {
  feedback_id: NonNullable<NotificationRow["feedback_id"]>;
  comment_id?: FeedbackCommentRow["id"] | null;
}) {
  const feedbackLink = `/feedback/${feedback_id}`;
  return comment_id ? `${feedbackLink}?commentId=${comment_id}` : feedbackLink;
}

export async function buildNotificationContent({
  type,
  feedback_id,
  recipient_user_id,
  actor_user_id,
  feedback_summary,
  comment_id,
}: BuildNotificationContentParams): Promise<NotificationContent> {
  const actorName =
    (actor_user_id ? await getAuthUserNameById(actor_user_id) : null) ?? "알 수 없는 사용자";
  const feedbackSummary = resolveFeedbackSummary(feedback_summary);

  const commonData = {
    feedback_id,
    comment_id: comment_id ?? null,
    recipient_user_id,
    actor_user_id,
    is_read: false,
  };

  switch (type) {
    case "feedback_submitted":
      return {
        ...commonData,
        type,
        title: "새 피드백 승인 요청",
        body: `${actorName}님의 ${feedbackSummary}가 등록되었습니다.`,
        link: "/admin/feedback",
      };
    case "feedback_resubmitted":
      return {
        ...commonData,
        type,
        title: "피드백 재승인 요청",
        body: `${actorName}님이 ${feedbackSummary}를 수정해 다시 검토를 요청했습니다.`,
        link: "/admin/feedback",
      };
    case "feedback_approved":
      return {
        ...commonData,
        type,
        title: "피드백이 승인되었어요",
        body: `작성한 ${feedbackSummary}가 승인되어 공개 보드에 표시됩니다.`,
        link: buildFeedbackLink({ feedback_id }),
      };
    case "feedback_rejected":
      return {
        ...commonData,
        type,
        title: "피드백이 반려되었어요",
        body: `작성한 ${feedbackSummary}가 반려되었습니다. 내용을 확인한 뒤 다시 수정해 주세요.`,
        link: buildFeedbackLink({ feedback_id }),
      };
    case "feedback_comment":
      return {
        ...commonData,
        type,
        title: "새 코멘트가 도착했어요",
        body: `${actorName}님이 ${feedbackSummary}에 코멘트를 남겼습니다.`,
        link: buildFeedbackLink({ feedback_id, comment_id }),
      };
    case "feedback_reply":
      return {
        ...commonData,
        type,
        title: "내 코멘트에 답글이 달렸어요",
        body: `${actorName}님이 내 코멘트에 답글을 남겼습니다.`,
        link: buildFeedbackLink({ feedback_id, comment_id }),
      };
  }
}
