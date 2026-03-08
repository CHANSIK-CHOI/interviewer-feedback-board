import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext, RequestAuthOptions, RequestAuthResult } from "@/lib/auth/request";
import { getUserName } from "@/lib/user/profile";
import type { SupabaseError } from "@/types/common";
import type { FeedbackPublicRow } from "@/types/feedback";
import type { ReviewFeedbackResult } from "@/lib/feedback/client";
import type { ReviewFeedbackResponse } from "@/types/response";

type ReviewFeedbackAction = "approve" | "reject";
type ReviewableFeedbackStatus = Extract<FeedbackPublicRow["status"], "pending" | "revised_pending">;

const REVIEWABLE_STATUSES: ReviewableFeedbackStatus[] = ["pending", "revised_pending"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReviewFeedbackResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const feedbackId = req.query.id;
  if (typeof feedbackId !== "string") {
    return res.status(400).json({ data: null, error: "Invalid feedback id" });
  }

  const auth: RequestAuthResult = await getRequestAuthContext(req, {
    requireAdmin: true,
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
    forbiddenError: "관리자만 검토할 수 있습니다.",
  } satisfies RequestAuthOptions);
  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }

  const { action }: { action?: ReviewFeedbackAction } = req.body ?? {};
  if (action !== "approve" && action !== "reject") {
    return res.status(400).json({ data: null, error: "Invalid review action" });
  }

  const {
    data: feedbackRow,
    error: feedbackError,
  }: { data: { status: FeedbackPublicRow["status"] } | null; error: SupabaseError } =
    await auth.context.supabaseServer
      .from("feedbacks")
      .select("status")
      .eq("id", feedbackId)
      .maybeSingle();

  if (feedbackError) {
    console.error("Select feedback for review failed", feedbackError);
    return res.status(500).json({ data: null, error: "피드백 검토 처리에 실패했습니다." });
  }

  if (!feedbackRow) {
    return res.status(404).json({ data: null, error: "피드백을 찾을 수 없습니다." });
  }

  if (!REVIEWABLE_STATUSES.includes(feedbackRow.status as ReviewableFeedbackStatus)) {
    return res.status(400).json({ data: null, error: "이미 검토가 완료된 피드백입니다." });
  }

  const reviewedBy = auth.context.userId;
  const reviewerName = getUserName(auth.context.authData.user ?? undefined);
  const reviewedAt = new Date().toISOString();
  const nextStatus: "approved" | "rejected" = action === "approve" ? "approved" : "rejected";
  const nextIsPublic = action === "approve";

  const {
    data: reviewedFeedback,
    error: reviewError,
  }: {
    data: ReviewFeedbackResult | null;
    error: SupabaseError;
  } = await auth.context.supabaseServer
    .from("feedbacks")
    .update({
      status: nextStatus,
      is_public: nextIsPublic,
      reviewed_at: reviewedAt,
      reviewed_by: reviewedBy,
    })
    .eq("id", feedbackId)
    .in("status", REVIEWABLE_STATUSES)
    .select("id, status, is_public, reviewed_at, reviewed_by")
    .maybeSingle();

  if (reviewError) {
    console.error("Update feedback review failed", reviewError);
    return res.status(500).json({ data: null, error: "피드백 검토 처리에 실패했습니다." });
  }

  if (!reviewedFeedback) {
    return res.status(409).json({ data: null, error: "이미 다른 관리자에 의해 처리되었습니다." });
  }

  return res.status(200).json({
    data: {
      ...reviewedFeedback,
      reviewer_name: reviewerName,
    },
    error: null,
  });
}
