import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext } from "@/lib/auth/request";
import { parseStatusQuery } from "@/lib/status/query";
import type { RevisedPendingOwnerFeedback } from "@/types/feedback";
import { FeedbackMineResponse } from "@/types/response";

const ALLOWED_STATUSES = ["pending", "revised_pending"] as const;
type MineStatus = (typeof ALLOWED_STATUSES)[number];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackMineResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const { statuses, error: statusError } = parseStatusQuery<MineStatus>({
    rawStatus: req.query.status,
    allowedStatuses: ALLOWED_STATUSES,
    defaultStatuses: ALLOWED_STATUSES,
    usageMessage: "Use ?status=pending,revised_pending",
  });
  if (statusError || !statuses) {
    return res.status(400).json({ data: null, error: statusError ?? "Invalid status query" });
  }

  try {
    const auth = await getRequestAuthContext(req);
    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const { context } = auth;

    if (context.isAdmin) {
      return res.status(200).json({ data: null, error: null });
    }

    const { data, error: dataError } = await context.supabaseServer
      .from("feedbacks")
      .select()
      .eq("author_id", context.userId)
      .in("status", statuses);

    if (dataError || !data) {
      return res
        .status(500)
        .json({ data: null, error: dataError?.message ?? "Select failed Owner Pending Data" });
    }

    const ownerFeedbacks: RevisedPendingOwnerFeedback[] = data.map((item) => ({
      ...item,
      isPreview: false,
    }));

    return res.status(200).json({ data: ownerFeedbacks, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
