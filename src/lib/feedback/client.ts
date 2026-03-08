import type { FeedbackPublicBase, FeedbackPublicRow } from "@/types/feedback";
import type { ReviewFeedbackResponse } from "@/types/response";

export type ReviewFeedbackAction = "approve" | "reject";

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

type ReviewFeedbackParams = {
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

  const result: ReviewFeedbackResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error || !result.data) {
    throw new Error(result.error ?? "피드백 검토 처리에 실패했습니다.");
  }

  return result.data;
}
