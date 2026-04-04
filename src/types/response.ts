import type { ApiResponse } from "./common";
import type {
  FeedbackPublicBase,
  OwnerFeedback,
  ReviewFeedbackResultWithReviewerName,
} from "./feedback";
import type { FeedbackComment } from "./feedback-comment";
import type { UserRole } from "./user-role";

export type SessionCookieSyncResponse = ApiResponse<{
  success: true;
}>;

export type WithdrawResponse = ApiResponse<{
  success: true;
}>;

export type EditFeedbackResponse = ApiResponse<{ id: FeedbackPublicBase["id"] }>;

export type ReviewFeedbackResponse = ApiResponse<ReviewFeedbackResultWithReviewerName>;

export type DeleteFeedbackResponse = ApiResponse<{ id: FeedbackPublicBase["id"] }>;

export type FeedbackResponse<T> = ApiResponse<T>;

export type FeedbackMineResponse = ApiResponse<OwnerFeedback[]>;

export type PendingCountResponse = ApiResponse<{
  count: number;
}>;

export type FeedbackCommentListResponse = ApiResponse<FeedbackComment[]>;

export type FeedbackCommentResponse = ApiResponse<FeedbackComment>;

export type DeleteFeedbackCommentResponse = ApiResponse<{
  id: FeedbackComment["id"];
}>;

type UserRoleSyncData = {
  role: UserRole["role"];
  isNewUser: boolean;
};
export type UserRoleSyncResponse = ApiResponse<UserRoleSyncData>;
