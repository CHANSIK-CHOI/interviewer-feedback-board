import { ReviewFeedbackResultWithReviewerName } from "@/lib/feedback/client";
import type { ApiResponse } from "./common";
import type { FeedbackPublicBase, RevisedPendingOwnerFeedback } from "./feedback";
import { UserRole } from "./user-role";

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

export type FeedbackMineResponse = ApiResponse<RevisedPendingOwnerFeedback[]>;

export type PendingCountResponse = ApiResponse<{
  count: number;
}>;

type UserRoleSyncData = {
  role: UserRole["role"];
  isNewUser: boolean;
};
export type UserRoleSyncResponse = ApiResponse<UserRoleSyncData>;
