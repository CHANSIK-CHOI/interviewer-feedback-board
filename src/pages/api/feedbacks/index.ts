import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext, RequestAuthOptions, RequestAuthResult } from "@/lib/auth/request";
import { getApprovedFeedbacks, getFeedbackRowsByStatuses } from "@/lib/feedback/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type {
  AdminReviewFeedback,
  ApprovedFeedback,
  FeedbackPublicAndEmailRow,
} from "@/types/feedback";
import { parseStatusQuery, ParseStatusQueryResult } from "@/lib/status/query";
import { FeedbackResponse } from "@/types/response";
import { getFeedbackCommentCounts } from "@/lib/feedback/comment";

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
    return res.status(400).json({ data: null, error: statusError ?? "Invalid status query" });
  }

  try {
    const isRequiresAdmin = statuses.some((status) => status !== "approved");

    if (!isRequiresAdmin) {
      const publicFeedbacks: ApprovedFeedback[] = await getApprovedFeedbacks();

      return res.status(200).json({ data: publicFeedbacks, error: null });
    }

    const auth: RequestAuthResult = await getRequestAuthContext(req, {
      requireAdmin: true,
    } satisfies RequestAuthOptions);

    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const supabaseServer = getSupabaseServer();
    if (!supabaseServer) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const feedbackRows: FeedbackPublicAndEmailRow[] = await getFeedbackRowsByStatuses({
      supabaseClient: supabaseServer,
      statuses,
    });

    const commentCounts = await getFeedbackCommentCounts({
      supabaseClient: auth.context.supabaseServer,
      feedbackIds: feedbackRows.map((item) => item.id),
    }).catch(() => ({}));

    const adminReviewFeedbacks: AdminReviewFeedback[] = feedbackRows.map((item) => {
      const { email, ...rest } = item;
      void email;
      return {
        ...rest,
        comment_count: commentCounts[item.id] ?? 0,
        isPreview: false,
      };
    });

    return res.status(200).json({ data: adminReviewFeedbacks, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
