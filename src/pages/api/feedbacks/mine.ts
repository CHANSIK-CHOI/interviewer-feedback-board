import type { ApiRequestAuthResult } from "@/lib/auth/request";
import { resolveApiRequestAuth } from "@/lib/auth/request";
import { countFeedbackCommentsByFeedbackIds } from "@/lib/feedback/comment";
import type { OwnerFeedback } from "@/types/feedback";
import type { FeedbackMineResponse } from "@/types/response";
import type { NextApiRequest, NextApiResponse } from "next";

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
    const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req);
    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }

    const { supabaseServerUserClient, userId, isAdmin } = auth.context;

    if (isAdmin) {
      return res.status(200).json({ data: [], error: null });
    }

    const { data, error: dataError } = await supabaseServerUserClient
      .from("feedbacks")
      .select("*")
      .eq("author_id", userId)
      .in("status", statuses);

    if (dataError || !data) {
      return res
        .status(500)
        .json({ data: null, error: dataError?.message ?? "Select failed Owner Pending Data" });
    }

    const feedbackIds = data.map((item) => item.id);
    const commentCounts = await countFeedbackCommentsByFeedbackIds({
      supabaseClient: supabaseServerUserClient,
      feedbackIds,
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
