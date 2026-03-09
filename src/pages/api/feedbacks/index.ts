import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext, RequestAuthOptions, RequestAuthResult } from "@/lib/auth/request";
import { getApprovedFeedbacks, getFeedbackRowsByStatuses } from "@/lib/feedback/server";
import { getRequiredSupabaseServer } from "@/lib/supabase/server";
import type {
  AdminReviewFeedback,
  ApprovedFeedback,
  FeedbackPublicAndEmailRow,
} from "@/types/feedback";
import { parseStatusQuery, ParseStatusQueryResult } from "@/lib/status/query";
import { FeedbackResponse } from "@/types/response";

/*
  전체 역할 : 해당 API는 GET /api/feedbacks?status=...로 피드백 목록을 가져옴
  핵심 규칙:
  - approved만 조회하면 공개 조회 허용
  - approved 외 상태(pending, revised_pending, rejected)가 하나라도 포함되면 admin만 허용
*/
const ALLOWED_STATUSES = ["pending", "approved", "rejected", "revised_pending"] as const;
type FeedbackStatus = (typeof ALLOWED_STATUSES)[number];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackResponse<ApprovedFeedback[] | AdminReviewFeedback[]>>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const { statuses, error: statusError }: ParseStatusQueryResult<FeedbackStatus> =
    parseStatusQuery<FeedbackStatus>({
      rawStatus: req.query.status,
      allowedStatuses: ALLOWED_STATUSES,
      defaultStatuses: ["approved"],
      usageMessage: "Use ?status=approved or ?status=pending,revised_pending",
    });
  if (statusError || !statuses) {
    // status 쿼리가 이상하면 바로 400으로 막음
    return res.status(400).json({ data: null, error: statusError ?? "Invalid status query" });
  }

  try {
    // approved 아닌 상태가 하나라도 있으면 true - admin만 허용
    const isRequiresAdmin = statuses.some((status) => status !== "approved");

    // 공개 조회 분기 (!isRequiresAdmin)
    if (!isRequiresAdmin) {
      const publicFeedbacks: ApprovedFeedback[] = await getApprovedFeedbacks();

      return res.status(200).json({ data: publicFeedbacks, error: null });
    }

    // 관리자 전용 조회 분기 (isRequiresAdmin)
    const auth: RequestAuthResult = await getRequestAuthContext(req, {
      requireAdmin: true,
    } satisfies RequestAuthOptions);

    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const supabaseServer = getRequiredSupabaseServer();

    const feedbackRows: FeedbackPublicAndEmailRow[] = await getFeedbackRowsByStatuses({
      supabaseClient: supabaseServer,
      statuses,
    });

    const adminReviewFeedbacks: AdminReviewFeedback[] = feedbackRows.map((item) => {
      const { email, ...rest } = item;
      void email;
      return {
        ...rest,
        isPreview: false,
      };
    });

    return res.status(200).json({ data: adminReviewFeedbacks, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
