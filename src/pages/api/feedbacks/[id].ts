import {
  FEEDBACK_FORBIDDEN_MESSAGE,
  FEEDBACK_FORM_ERROR_MESSAGES,
  FEEDBACK_NOT_FOUND_MESSAGE,
  NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE,
} from "@/constants";
import {
  ApiRequestAuthOptions,
  ApiRequestAuthResult,
  resolveApiRequestAuth,
} from "@/lib/auth/request";
import { notifyAdmins } from "@/lib/notification/server";
import { toNullableTrimmedString, toStrictBoolean, toTrimmedString } from "@/lib/shared/normalize";
import type { SupabaseError } from "@/types/common";
import type { FeedbackPublicBase, FeedbackPublicRow } from "@/types/feedback";
import type { FeedbackFormValues } from "@/types/forms";
import { EditFeedbackResponse } from "@/types/response";
import type { NextApiRequest, NextApiResponse } from "next";

type ExistingFeedbackRow = {
  id: FeedbackPublicRow["id"];
  author_id: FeedbackPublicRow["author_id"];
  status: FeedbackPublicRow["status"];
  revision_count: FeedbackPublicRow["revision_count"];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EditFeedbackResponse>
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

  try {
    const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req, {
      missingAccessTokenError: "로그인이 필요합니다.",
      unauthorizedError: "로그인 상태를 확인해주세요.",
    } satisfies ApiRequestAuthOptions);

    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const { supabaseServerUserClient, userId } = auth.context;

    const body: Partial<FeedbackFormValues> = req.body ?? {};
    const rating = Number(body.rating);
    const is_company_public = toStrictBoolean(body.is_company_public);
    const display_name = toTrimmedString(body.display_name);
    const summary = toTrimmedString(body.summary);
    const company_name = toNullableTrimmedString(body.company_name);
    const avatar_url = toNullableTrimmedString(body.avatar);
    const strengths = toNullableTrimmedString(body.strengths);
    const questions = toNullableTrimmedString(body.questions);
    const suggestions = toNullableTrimmedString(body.suggestions);
    const tagsArray = body.tags;
    const tags = Array.isArray(tagsArray)
      ? Array.from(
          new Set(
            tagsArray
              .filter((tag): tag is string => typeof tag === "string")
              .map((tag) => tag.trim())
              .filter(Boolean)
          )
        )
      : [];

    if (!display_name || !summary) {
      return res.status(400).json({ data: null, error: FEEDBACK_FORM_ERROR_MESSAGES.nameSummary });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ data: null, error: FEEDBACK_FORM_ERROR_MESSAGES.rating });
    }

    if (tags.length === 0) {
      return res.status(400).json({ data: null, error: FEEDBACK_FORM_ERROR_MESSAGES.tag });
    }

    if (is_company_public === null) {
      return res
        .status(400)
        .json({ data: null, error: FEEDBACK_FORM_ERROR_MESSAGES.companyPublic });
    }

    if (is_company_public && !company_name) {
      return res.status(400).json({ data: null, error: FEEDBACK_FORM_ERROR_MESSAGES.company });
    }

    const {
      data: feedbackRow,
      error: feedbackRowError,
    }: {
      data: ExistingFeedbackRow | null;
      error: SupabaseError;
    } = await supabaseServerUserClient
      .from("feedbacks")
      .select("id, author_id, status, revision_count")
      .eq("id", feedbackId)
      .maybeSingle();

    if (feedbackRowError) {
      console.error("Select feedback row failed", feedbackRowError);
      return res.status(500).json({ data: null, error: NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE });
    }

    if (!feedbackRow) {
      return res.status(404).json({ data: null, error: FEEDBACK_NOT_FOUND_MESSAGE });
    }

    if (feedbackRow.author_id !== userId) {
      return res.status(403).json({ data: null, error: FEEDBACK_FORBIDDEN_MESSAGE });
    }

    const nextStatus = feedbackRow.status === "pending" ? "pending" : "revised_pending";
    const nextRevisionCount: FeedbackPublicBase["revision_count"] = feedbackRow.revision_count + 1;

    const { data, error }: { data: { id: FeedbackPublicBase["id"] } | null; error: SupabaseError } =
      await supabaseServerUserClient
        .from("feedbacks")
        .update({
          display_name,
          company_name,
          is_company_public,
          avatar_url,
          summary,
          strengths,
          questions,
          suggestions,
          rating,
          tags,
          status: nextStatus,
          is_public: false,
          revision_count: nextRevisionCount,
          reviewed_at: null,
          reviewed_by: null,
          review_queue_status: null,
        })
        .eq("id", feedbackId)
        .eq("author_id", userId)
        .select("id")
        .single();

    if (error || !data) {
      console.error("Update feedback failed", error);
      return res.status(500).json({ data: null, error: NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE });
    }

    try {
      await notifyAdmins({
        type: "feedback_resubmitted",
        actorUserId: userId,
        feedbackId: data.id,
        feedbackSummary: summary,
        metadata: {
          feedback_status: nextStatus,
        },
      });
    } catch (notificationError) {
      const message =
        notificationError instanceof Error
          ? notificationError.message
          : "알림 처리 중 오류가 발생했습니다.";
      console.error(message);
    }

    return res.status(200).json({ data, error: null });
  } catch (e) {
    console.error("Update feedback handler failed", e);
    return res.status(500).json({ data: null, error: NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE });
  }
}
