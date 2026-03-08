import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext, RequestAuthOptions, RequestAuthResult } from "@/lib/auth/request";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  FEEDBACK_DELETE_FALLBACK_ERROR_MESSAGE,
  FEEDBACK_DELETE_FORBIDDEN_MESSAGE,
  FEEDBACK_NOT_FOUND_MESSAGE,
} from "@/constants";
import type { SupabaseError } from "@/types/common";
import type { FeedbackPublicBase } from "@/types/feedback";
import type { DeleteFeedbackResponse } from "@/types/response";

type FeedbackOwnerRow = {
  id: FeedbackPublicBase["id"];
  author_id: FeedbackPublicBase["author_id"];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteFeedbackResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const feedbackId = req.query.id;
  if (typeof feedbackId !== "string") {
    return res.status(400).json({ data: null, error: "Invalid feedback id" });
  }

  const auth: RequestAuthResult = await getRequestAuthContext(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  } satisfies RequestAuthOptions);

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }

  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    return res.status(500).json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const {
    data: feedbackRow,
    error: feedbackError,
  }: { data: FeedbackOwnerRow | null; error: SupabaseError } = await auth.context.supabaseServer
    .from("feedbacks")
    .select("id, author_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError) {
    console.error("Select feedback for delete failed", feedbackError);
    return res.status(500).json({ data: null, error: FEEDBACK_DELETE_FALLBACK_ERROR_MESSAGE });
  }

  if (!feedbackRow) {
    return res.status(404).json({ data: null, error: FEEDBACK_NOT_FOUND_MESSAGE });
  }

  if (!auth.context.isAdmin && feedbackRow.author_id !== auth.context.userId) {
    return res.status(403).json({ data: null, error: FEEDBACK_DELETE_FORBIDDEN_MESSAGE });
  }

  const {
    data: deletedFeedback,
    error: deleteError,
  }: { data: { id: FeedbackPublicBase["id"] } | null; error: SupabaseError } = await supabaseServer
    .from("feedbacks")
    .delete()
    .eq("id", feedbackId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error("Delete feedback failed", deleteError);
    return res.status(500).json({ data: null, error: FEEDBACK_DELETE_FALLBACK_ERROR_MESSAGE });
  }

  if (!deletedFeedback) {
    return res.status(404).json({ data: null, error: FEEDBACK_NOT_FOUND_MESSAGE });
  }

  return res.status(200).json({ data: deletedFeedback, error: null });
}
