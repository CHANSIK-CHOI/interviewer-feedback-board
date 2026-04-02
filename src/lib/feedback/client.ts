import type { FeedbackPublicBase, FeedbackPublicRow } from "@/types/feedback";
import type { ApiResponse } from "@/types/common";
import type {
  FeedbackComment,
  FeedbackCommentCreatePayload,
  FeedbackCommentUpdatePayload,
} from "@/types/feedback-comment";

export type ReviewFeedbackAction = "approve" | "reject" | "reopen";

export type ReviewFeedbackResult = {
  id: FeedbackPublicBase["id"];
  status: FeedbackPublicRow["status"];
  is_public: FeedbackPublicBase["is_public"];
  reviewed_at: FeedbackPublicBase["reviewed_at"];
  reviewed_by: FeedbackPublicBase["reviewed_by"];
};

export type ReviewFeedbackResultWithReviewerName = ReviewFeedbackResult & {
  reviewer_name: string | null;
};

export type ReviewFeedbackParams = {
  feedbackId: FeedbackPublicBase["id"];
  action: ReviewFeedbackAction;
  accessToken: string;
};

export async function reviewFeedback({
  feedbackId,
  action,
  accessToken,
}: ReviewFeedbackParams): Promise<ReviewFeedbackResultWithReviewerName> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(`/api/feedbacks/${encodeURIComponent(feedbackId)}/review`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action }),
  });

  const result: ApiResponse<ReviewFeedbackResultWithReviewerName> = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error || !result.data) {
    throw new Error(result.error ?? "피드백 검토 처리에 실패했습니다.");
  }

  return result.data;
}

export type DeleteFeedbackResult = {
  id: FeedbackPublicBase["id"];
};

export type DeleteFeedbackParams = {
  feedbackId: FeedbackPublicBase["id"];
  accessToken: string;
};

export async function deleteFeedback({
  feedbackId,
  accessToken,
}: DeleteFeedbackParams): Promise<DeleteFeedbackResult> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(`/api/feedbacks/${encodeURIComponent(feedbackId)}/delete`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result: ApiResponse<DeleteFeedbackResult> = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error || !result.data) {
    throw new Error(result.error ?? "피드백 삭제에 실패했습니다.");
  }

  return result.data;
}

export type CreateFeedbackCommentParams = {
  feedbackId: FeedbackPublicBase["id"];
  accessToken: string;
  payload: FeedbackCommentCreatePayload;
};

export async function createFeedbackComment({
  feedbackId,
  accessToken,
  payload,
}: CreateFeedbackCommentParams): Promise<FeedbackComment> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(`/api/feedbacks/${encodeURIComponent(feedbackId)}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const result: ApiResponse<FeedbackComment> = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error || !result.data) {
    throw new Error(result.error ?? "코멘트 등록에 실패했습니다.");
  }

  return result.data;
}

export type UpdateFeedbackCommentParams = {
  feedbackId: FeedbackPublicBase["id"];
  commentId: FeedbackComment["id"];
  accessToken: string;
  payload: FeedbackCommentUpdatePayload;
};

export async function updateFeedbackComment({
  feedbackId,
  commentId,
  accessToken,
  payload,
}: UpdateFeedbackCommentParams): Promise<FeedbackComment> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(
    `/api/feedbacks/${encodeURIComponent(feedbackId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const result: ApiResponse<FeedbackComment> = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error || !result.data) {
    throw new Error(result.error ?? "코멘트 수정에 실패했습니다.");
  }

  return result.data;
}

export type DeleteFeedbackCommentResult = {
  id: FeedbackComment["id"];
};

export type DeleteFeedbackCommentParams = {
  feedbackId: FeedbackPublicBase["id"];
  commentId: FeedbackComment["id"];
  accessToken: string;
};

export async function deleteFeedbackComment({
  feedbackId,
  commentId,
  accessToken,
}: DeleteFeedbackCommentParams): Promise<DeleteFeedbackCommentResult> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(
    `/api/feedbacks/${encodeURIComponent(feedbackId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const result: ApiResponse<DeleteFeedbackCommentResult> = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error || !result.data) {
    throw new Error(result.error ?? "코멘트 삭제에 실패했습니다.");
  }

  return result.data;
}
