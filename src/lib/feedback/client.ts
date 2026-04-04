import type {
  AdminReviewFeedback,
  FeedbackPublicBase,
  OwnerFeedback,
  ReviewFeedbackAction,
  ReviewFeedbackResultWithReviewerName,
} from "@/types/feedback";
import type { ApiResponse } from "@/types/common";
import type {
  FeedbackComment,
  FeedbackCommentCreatePayload,
  FeedbackCommentUpdatePayload,
} from "@/types/feedback-comment";
import type { FeedbackMineResponse, FeedbackResponse, PendingCountResponse } from "@/types/response";

export type {
  ReviewFeedbackAction,
  ReviewFeedbackResult,
  ReviewFeedbackResultWithReviewerName,
} from "@/types/feedback";

const MINE_STATUS_QUERY = new URLSearchParams({
  status: "pending,revised_pending,rejected",
}).toString();

const ADMIN_REVIEW_STATUS_QUERY = new URLSearchParams({
  status: "pending,revised_pending,rejected",
}).toString();

export type GetPendingFeedbackCountParams = {
  accessToken: string;
  signal?: AbortSignal;
};

export async function getPendingFeedbackCount({
  accessToken,
  signal,
}: GetPendingFeedbackCountParams): Promise<number> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch("/api/feedbacks/pending-count", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const result: PendingCountResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "Failed to fetch pending count");
  }

  return result.data.count;
}

export type GetMyFeedbacksParams = {
  accessToken: string;
  signal?: AbortSignal;
};

export async function getMyFeedbacks({
  accessToken,
  signal,
}: GetMyFeedbacksParams): Promise<OwnerFeedback[]> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(`/api/feedbacks/mine?${MINE_STATUS_QUERY}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const result: FeedbackMineResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (result.error !== null) {
    throw new Error(result.error ?? "Select failed Owner Pending Data");
  }

  if (!response.ok) {
    throw new Error("Select failed Owner Pending Data");
  }

  return result.data;
}

export type GetAdminReviewFeedbacksParams = {
  accessToken: string;
  signal?: AbortSignal;
};

export async function getAdminReviewFeedbacks({
  accessToken,
  signal,
}: GetAdminReviewFeedbacksParams): Promise<AdminReviewFeedback[]> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch(`/api/feedbacks?${ADMIN_REVIEW_STATUS_QUERY}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const result: FeedbackResponse<AdminReviewFeedback[]> = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (result.error !== null) {
    throw new Error(result.error ?? "Failed to fetch admin review feedbacks");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch admin review feedbacks");
  }

  return result.data;
}

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

  if (result.error !== null) {
    throw new Error(result.error ?? "피드백 검토 처리에 실패했습니다.");
  }

  if (!response.ok) {
    throw new Error("피드백 검토 처리에 실패했습니다.");
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

  if (result.error !== null) {
    throw new Error(result.error ?? "피드백 삭제에 실패했습니다.");
  }

  if (!response.ok) {
    throw new Error("피드백 삭제에 실패했습니다.");
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

  if (result.error !== null) {
    throw new Error(result.error ?? "코멘트 등록에 실패했습니다.");
  }

  if (!response.ok) {
    throw new Error("코멘트 등록에 실패했습니다.");
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

  if (result.error !== null) {
    throw new Error(result.error ?? "코멘트 수정에 실패했습니다.");
  }

  if (!response.ok) {
    throw new Error("코멘트 수정에 실패했습니다.");
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

  if (result.error !== null) {
    throw new Error(result.error ?? "코멘트 삭제에 실패했습니다.");
  }

  if (!response.ok) {
    throw new Error("코멘트 삭제에 실패했습니다.");
  }

  return result.data;
}
