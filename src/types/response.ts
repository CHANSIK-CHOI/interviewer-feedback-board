import { ReviewFeedbackResultWithReviewerName } from "@/lib/feedback/client";
import type { ApiResponse } from "./common";
import type { FeedbackPublicBase, RevisedPendingOwnerFeedback } from "./feedback";
import { UserRole } from "./user-role";

// api/auth/session
export type SessionCookieSyncResponse = ApiResponse<{
  success: true;
}>;

// api/auth/withdraw
export type WithdrawResponse = ApiResponse<{
  success: true;
}>;

// api/feedbacks/[id] & api/feedbacks/new
export type EditFeedbackResponse = ApiResponse<{ id: FeedbackPublicBase["id"] }>;

// api/feedbacks/[id]/review
export type ReviewFeedbackResponse = ApiResponse<ReviewFeedbackResultWithReviewerName>;

// api/feedbacks/[id]/delete
export type DeleteFeedbackResponse = ApiResponse<{ id: FeedbackPublicBase["id"] }>;

// api/feedbacks
export type FeedbackResponse<T> = ApiResponse<T>;

// api/feedbacks/mine
export type FeedbackMineResponse = ApiResponse<RevisedPendingOwnerFeedback[]>;

// api/feedbacks/pending-count
export type PendingCountResponse = ApiResponse<{
  count: number;
}>;

// api/user-roles/index
type UserRoleSyncData = {
  role: UserRole["role"];
  isNewUser: boolean;
};
export type UserRoleSyncResponse = ApiResponse<UserRoleSyncData>;
