import type { NextApiRequest, NextApiResponse } from "next";
import {
  ApiRequestAuthOptions,
  ApiRequestAuthResult,
  resolveApiRequestAuth,
} from "@/lib/auth/request";
import { getApprovedFeedbacks, getFeedbackRowsByStatuses } from "@/lib/feedback/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import type {
  AdminReviewFeedback,
  ApprovedFeedback,
  FeedbackPublicWithEmailRow,
} from "@/types/feedback";
import { parseStatusQuery, ParseStatusQueryResult } from "@/lib/status/query";
import { FeedbackResponse } from "@/types/response";
import { countFeedbackCommentsByFeedbackIds } from "@/lib/feedback/comment";

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
    const requiresAdmin = statuses.some((status) => status !== "approved");

    if (!requiresAdmin) {
      const publicFeedbacks: ApprovedFeedback[] = await getApprovedFeedbacks();

      return res.status(200).json({ data: publicFeedbacks, error: null });
    }

    const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req, {
      requireAdmin: true,
    } satisfies ApiRequestAuthOptions);

    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const { supabaseServerUserClient } = auth.context;
    const supabaseServerAdminClient = getSupabaseServerAdminClient();
    if (!supabaseServerAdminClient) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const feedbackRows: FeedbackPublicWithEmailRow[] = await getFeedbackRowsByStatuses({
      supabaseClient: supabaseServerAdminClient,
      statuses,
    });

    const commentCounts: Record<string, number> = await countFeedbackCommentsByFeedbackIds({
      supabaseClient: supabaseServerUserClient,
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
