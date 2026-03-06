import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext } from "@/lib/auth/request";
import type { FeedbackFormValues } from "@/types/forms";
import { FEEDBACK_FORM_ERROR_MESSAGES, NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE } from "@/constants";
import { toNullableTrimmedString, toStrictBoolean, toTrimmedString } from "@/lib/shared/normalize";
import { CreateFeedbackResponse, RequestAuthOptions, RequestAuthResult } from "@/types/response";
import { FeedbackPublicBase } from "@/types/feedback";
import { SupabaseError } from "@/types/common";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateFeedbackResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  try {
    const authOption: RequestAuthOptions = {
      missingAccessTokenError: "로그인이 필요합니다.",
      unauthorizedError: "로그인 상태를 확인해주세요.",
    };
    const auth: RequestAuthResult = await getRequestAuthContext(req, authOption);

    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }

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

    const email = auth.context.authData.user?.email;
    if (!email) {
      return res.status(400).json({ data: null, error: FEEDBACK_FORM_ERROR_MESSAGES.email });
    }

    const { data, error }: { data: { id: FeedbackPublicBase["id"] } | null; error: SupabaseError } =
      await auth.context.supabaseServer
        .from("feedbacks")
        .insert({
          author_id: auth.context.userId,
          display_name,
          company_name,
          is_company_public,
          avatar_url,
          email,
          summary,
          strengths,
          questions,
          suggestions,
          rating,
          tags,
          status: "pending",
          is_public: false,
          revision_count: 0,
          reviewed_at: null,
          reviewed_by: null,
        })
        .select("id")
        .single();

    if (error || !data) {
      console.error("Create feedback insert failed", error);
      return res.status(500).json({ data: null, error: NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE });
    }

    return res.status(201).json({ data, error: null });
  } catch (e) {
    console.error("Create feedback handler failed", e);
    return res.status(500).json({ data: null, error: NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE });
  }
}
