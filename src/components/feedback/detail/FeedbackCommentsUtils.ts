import type { FeedbackComment, FeedbackCommentRole } from "@/types/feedback-comment";

export const getFeedbackCommentRoleLabel = (role: FeedbackCommentRole) => {
  return role === "admin" ? "관리자" : "작성자";
};

export const getFeedbackCommentRoleBadgeTone = (role: FeedbackCommentRole) => {
  return role === "admin"
    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
    : "bg-blue-500/12 text-blue-700 dark:text-blue-300";
};

export const resolveFeedbackCommentRole = ({
  authorId,
  feedbackAuthorId,
}: {
  authorId: FeedbackComment["author_id"];
  feedbackAuthorId: FeedbackComment["author_id"];
}): FeedbackCommentRole => {
  return authorId === feedbackAuthorId ? "author" : "admin";
};

export const canEditFeedbackComment = ({
  canWrite,
  currentUserId,
  authorId,
}: {
  canWrite: boolean;
  currentUserId: string | null;
  authorId: FeedbackComment["author_id"];
}) => {
  return canWrite && currentUserId === authorId;
};

export const canDeleteFeedbackComment = ({
  canWrite,
  currentUserId,
  isAdmin,
  authorId,
}: {
  canWrite: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  authorId: FeedbackComment["author_id"];
}) => {
  return isAdmin || (canWrite && currentUserId === authorId);
};
