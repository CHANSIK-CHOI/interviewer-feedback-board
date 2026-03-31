import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAccessToken, getRequestAuthContext } from "@/lib/auth/request";
import { getAuthContextByAccessToken } from "@/lib/auth/server";
import { getSupabaseServerAdminClient, getSupabaseServerAnonClient } from "@/lib/supabase/server";
import { getFeedbackComments } from "@/lib/feedback/comment";
import { getAvatarUrl, getUserName } from "@/lib/user/profile";
import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { FeedbackPublicBase } from "@/types/feedback";
import type { FeedbackCommentCreatePayload, FeedbackCommentRow } from "@/types/feedback-comment";
import type { FeedbackCommentListResponse, FeedbackCommentResponse } from "@/types/response";
import type { SupabaseError } from "@/types/common";

type FeedbackCommentTargetRow = {
  id: FeedbackPublicBase["id"];
  author_id: FeedbackPublicBase["author_id"];
  status: "pending" | "approved" | "rejected" | "revised_pending";
  is_public: boolean;
  comments_unlocked_at: string | null;
};

type FeedbackCommentParentRow = Pick<
  FeedbackCommentRow,
  "id" | "feedback_id" | "parent_comment_id"
>;

const FEEDBACK_COMMENT_COLUMNS =
  "id, feedback_id, parent_comment_id, author_id, author_name, author_avatar_url, body, created_at, updated_at, edited_at";

const COMMENT_CREATE_ERROR_MESSAGE = "코멘트 등록에 실패했습니다.";

const normalizeCommentPayload = (body: Partial<FeedbackCommentCreatePayload>) => {
  const nextBody = typeof body.body === "string" ? body.body.trim() : "";
  const parentCommentId =
    typeof body.parentCommentId === "string" && body.parentCommentId.trim()
      ? body.parentCommentId.trim()
      : null;

  return {
    body: nextBody,
    parentCommentId,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentListResponse | FeedbackCommentResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  const feedbackId = req.query.id;
  if (typeof feedbackId !== "string") {
    return res.status(400).json({ data: null, error: "Invalid feedback id" });
  }

  if (req.method === "GET") {
    const supabaseServerAdminClient = getSupabaseServerAdminClient();
    if (!supabaseServerAdminClient) {
      return res
        .status(500)
        .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    const {
      data: feedbackRow,
      error: feedbackError,
    }: { data: Pick<FeedbackCommentTargetRow, "id" | "author_id"> | null; error: SupabaseError } =
      await supabaseServerAdminClient
        .from("feedbacks")
        .select("id, author_id")
        .eq("id", feedbackId)
        .maybeSingle();

    if (feedbackError) {
      return res.status(500).json({
        data: null,
        error: resolveSupabaseErrorMessage(feedbackError, "댓글 조회에 실패했습니다."),
      });
    }

    if (!feedbackRow) {
      return res.status(404).json({ data: null, error: "피드백을 찾을 수 없습니다." });
    }

    const { accessToken } = getRequestAccessToken(req);
    const authContext = accessToken
      ? (await getAuthContextByAccessToken(accessToken)).context
      : null;
    const supabaseServerUserClient = authContext?.supabaseServerUserClient ?? null;
    const supabaseServerAnonClient = getSupabaseServerAnonClient();
    const commentReader = supabaseServerUserClient ?? supabaseServerAnonClient;

    if (!commentReader) {
      return res
        .status(500)
        .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
    }

    try {
      const comments = await getFeedbackComments({
        supabaseClient: commentReader,
        feedbackId,
      });

      return res.status(200).json({ data: comments, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "댓글 조회에 실패했습니다.";
      return res.status(500).json({ data: null, error: message });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const auth = await getRequestAuthContext(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }
  const { authData, isAdmin, supabaseServerUserClient, userId } = auth.context;

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const {
    data: feedbackRow,
    error: feedbackError,
  }: { data: FeedbackCommentTargetRow | null; error: SupabaseError } =
    await supabaseServerAdminClient
      .from("feedbacks")
      .select("id, author_id, status, is_public, comments_unlocked_at")
      .eq("id", feedbackId)
      .maybeSingle();

  if (feedbackError) {
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(feedbackError, COMMENT_CREATE_ERROR_MESSAGE),
    });
  }

  if (!feedbackRow) {
    return res.status(404).json({ data: null, error: "피드백을 찾을 수 없습니다." });
  }

  if (!feedbackRow.comments_unlocked_at) {
    return res
      .status(400)
      .json({ data: null, error: "코멘트는 첫 승인 이후부터 사용할 수 있습니다." });
  }

  if (feedbackRow.status !== "approved" || !feedbackRow.is_public) {
    return res
      .status(403)
      .json({ data: null, error: "현재는 승인된 공개 글에서만 코멘트를 작성할 수 있습니다." });
  }

  if (!isAdmin && feedbackRow.author_id !== userId) {
    return res.status(403).json({ data: null, error: "코멘트 작성 권한이 없습니다." });
  }

  const { body, parentCommentId } = normalizeCommentPayload(req.body ?? {});
  if (!body) {
    return res.status(400).json({ data: null, error: "코멘트 내용을 입력해주세요." });
  }

  if (body.length > 1000) {
    return res.status(400).json({ data: null, error: "코멘트는 1000자 이하로 작성해주세요." });
  }

  if (parentCommentId) {
    const {
      data: parentRow,
      error: parentError,
    }: { data: FeedbackCommentParentRow | null; error: SupabaseError } =
      await supabaseServerAdminClient
        .from("feedback_comments")
        .select("id, feedback_id, parent_comment_id")
        .eq("id", parentCommentId)
        .maybeSingle();

    if (parentError) {
      return res.status(500).json({
        data: null,
        error: resolveSupabaseErrorMessage(parentError, COMMENT_CREATE_ERROR_MESSAGE),
      });
    }

    if (!parentRow) {
      return res.status(404).json({ data: null, error: "답글 대상 코멘트를 찾을 수 없습니다." });
    }

    if (parentRow.feedback_id !== feedbackId) {
      return res
        .status(400)
        .json({ data: null, error: "같은 피드백의 코멘트에만 답글을 달 수 있습니다." });
    }

    if (parentRow.parent_comment_id) {
      return res.status(400).json({ data: null, error: "답글에는 다시 답글을 달 수 없습니다." });
    }
  }

  const authorName = getUserName(authData.user ?? undefined);
  const authorAvatarUrl = getAvatarUrl(authData.user ?? undefined);

  const {
    data: createdComment,
    error: createError,
  }: { data: FeedbackCommentRow | null; error: SupabaseError } = await supabaseServerUserClient
    .from("feedback_comments")
    .insert({
      feedback_id: feedbackId,
      parent_comment_id: parentCommentId,
      author_id: userId,
      author_name: authorName,
      author_avatar_url: authorAvatarUrl,
      body,
    })
    .select(FEEDBACK_COMMENT_COLUMNS)
    .maybeSingle();

  if (createError || !createdComment) {
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(createError, COMMENT_CREATE_ERROR_MESSAGE),
    });
  }

  try {
    await res.revalidate("/feedback");
  } catch (error) {
    console.warn("Failed to revalidate /feedback after comment create", error);
  }

  return res.status(201).json({
    data: createdComment,
    error: null,
  });
}
