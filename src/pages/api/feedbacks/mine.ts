import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext } from "@/lib/auth/request";
import type { RequestAuthResult } from "@/lib/auth/request";
import type { OwnerFeedback } from "@/types/feedback";
import type { FeedbackMineResponse } from "@/types/response";

const ALLOWED_STATUSES = ["pending", "revised_pending", "rejected"] as const;
type MineStatus = (typeof ALLOWED_STATUSES)[number];

const parseMineStatuses = (
  rawStatus: string | string[] | undefined
): { statuses: MineStatus[] | null; error: string | null } => {
  if (typeof rawStatus === "undefined") {
    return {
      statuses: [...ALLOWED_STATUSES],
      error: null,
    };
  }

  const parsed = (Array.isArray(rawStatus) ? rawStatus : [rawStatus])
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsed.length === 0) {
    return {
      statuses: null,
      error: "Invalid status query. Use ?status=pending,revised_pending,rejected",
    };
  }

  const allowedStatusSet = new Set<MineStatus>(ALLOWED_STATUSES);
  const invalidStatuses = parsed.filter((status) => !allowedStatusSet.has(status as MineStatus));

  if (invalidStatuses.length > 0) {
    return {
      statuses: null,
      error: `Unsupported status: ${invalidStatuses.join(", ")}`,
    };
  }

  return {
    statuses: Array.from(new Set(parsed)) as MineStatus[],
    error: null,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackMineResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const { statuses, error: statusError } = parseMineStatuses(req.query.status);
  if (statusError || !statuses) {
    return res.status(400).json({ data: null, error: statusError ?? "Invalid status query" });
  }

  try {
    const auth: RequestAuthResult = await getRequestAuthContext(req);
    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }

    if (auth.context.isAdmin) {
      return res.status(200).json({ data: null, error: null });
    }
    const { supabaseServerUserClient, userId } = auth.context;

    const { data, error: dataError } = await supabaseServerUserClient
      .from("feedbacks")
      .select()
      .eq("author_id", userId)
      .in("status", statuses);

    if (dataError || !data) {
      return res
        .status(500)
        .json({ data: null, error: dataError?.message ?? "Select failed Owner Pending Data" });
    }

    const feedbackIds = data.map((item) => item.id);
    const commentCounts =
      feedbackIds.length === 0
        ? {}
        : await supabaseServerUserClient
            .from("feedback_comments")
            .select("feedback_id")
            .in("feedback_id", feedbackIds)
            .then(({ data: commentRows, error: commentError }) => {
              if (commentError || !commentRows) {
                return {};
              }

              return commentRows.reduce<Record<string, number>>((acc, row) => {
                const feedbackId = typeof row.feedback_id === "string" ? row.feedback_id : null;
                if (!feedbackId) return acc;
                acc[feedbackId] = (acc[feedbackId] ?? 0) + 1;
                return acc;
              }, {});
            });

    const ownerFeedbacks: OwnerFeedback[] = data.map((item) => ({
      ...item,
      comment_count: commentCounts[item.id] ?? 0,
      isPreview: false,
    }));

    return res.status(200).json({ data: ownerFeedbacks, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
