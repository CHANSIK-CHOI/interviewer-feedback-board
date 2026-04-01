import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAccessToken, getRequestAuthContext } from "@/lib/auth/request";
import { getAuthContextByAccessToken } from "@/lib/auth/server";
import { getSupabaseServerAdminClient, getSupabaseServerAnonClient } from "@/lib/supabase/server";
import {
  FEEDBACK_COMMENT_COLUMNS,
  findFeedbackCommentTarget,
  listFeedbackComments,
  normalizeCreateFeedbackCommentPayload,
  type FeedbackCommentReplyTargetValidationError,
  type FeedbackCommentTargetRow,
  validateCommentBody,
  validateFeedbackCommentReplyTarget,
} from "@/lib/feedback/comment";
import { getAvatarUrl, getUserName } from "@/lib/user/profile";
import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { FeedbackCommentRow } from "@/types/feedback-comment";
import type { FeedbackCommentListResponse, FeedbackCommentResponse } from "@/types/response";
import type { SupabaseError } from "@/types/common";

const COMMENT_CREATE_ERROR_MESSAGE = "코멘트 등록에 실패했습니다.";
const COMMENT_READ_ERROR_MESSAGE = "댓글 조회에 실패했습니다.";

const resolveCommentReaderFromRequest = async (req: NextApiRequest) => {
  const { accessToken } = getRequestAccessToken(req);
  const authContext = accessToken ? (await getAuthContextByAccessToken(accessToken)).context : null;
  const supabaseServerUserClient = authContext?.supabaseServerUserClient ?? null;
  const supabaseServerAnonClient = getSupabaseServerAnonClient();

  return supabaseServerUserClient ?? supabaseServerAnonClient;
};

const resolveReplyTargetValidationErrorResponse = (
  validationError: FeedbackCommentReplyTargetValidationError
) => {
  switch (validationError) {
    case "PARENT_NOT_FOUND":
      return { status: 404, error: "답글 대상 코멘트를 찾을 수 없습니다." };
    case "DIFFERENT_FEEDBACK":
      return {
        status: 400,
        error: "같은 피드백의 코멘트에만 답글을 달 수 있습니다.",
      };
    case "NESTED_REPLY_NOT_ALLOWED":
      return { status: 400, error: "답글에는 다시 답글을 달 수 없습니다." };
    default:
      return { status: 400, error: "유효하지 않은 답글 대상입니다." };
  }
};

async function handleGetComments(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentListResponse | FeedbackCommentResponse>,
  feedbackId: string
) {
  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const {
    data: feedbackRow,
    error: feedbackError,
  }: { data: FeedbackCommentTargetRow | null; error: SupabaseError } = await findFeedbackCommentTarget(
    {
      supabaseClient: supabaseServerAdminClient,
      feedbackId,
    }
  );

  if (feedbackError) {
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(feedbackError, COMMENT_READ_ERROR_MESSAGE),
    });
  }

  if (!feedbackRow) {
    return res.status(404).json({ data: null, error: "피드백을 찾을 수 없습니다." });
  }

  const commentReader = await resolveCommentReaderFromRequest(req);
  if (!commentReader) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
  }

  try {
    const comments = await listFeedbackComments({
      supabaseClient: commentReader,
      feedbackId,
    });

    return res.status(200).json({ data: comments, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : COMMENT_READ_ERROR_MESSAGE;
    return res.status(500).json({ data: null, error: message });
  }
}

async function handleCreateComment(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentListResponse | FeedbackCommentResponse>,
  feedbackId: string
) {
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
  }: { data: FeedbackCommentTargetRow | null; error: SupabaseError } = await findFeedbackCommentTarget(
    {
      supabaseClient: supabaseServerAdminClient,
      feedbackId,
    }
  );

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

  const { body, parentCommentId } = normalizeCreateFeedbackCommentPayload(req.body ?? {});
  const bodyValidationError = validateCommentBody(body);
  if (bodyValidationError) {
    return res.status(400).json({ data: null, error: bodyValidationError });
  }

  if (parentCommentId) {
    const { validationError, error: replyTargetError } = await validateFeedbackCommentReplyTarget({
      supabaseClient: supabaseServerAdminClient,
      feedbackId,
      parentCommentId,
    });

    if (replyTargetError) {
      return res.status(500).json({
        data: null,
        error: resolveSupabaseErrorMessage(replyTargetError, COMMENT_CREATE_ERROR_MESSAGE),
      });
    }

    if (validationError) {
      const replyTargetValidationError =
        resolveReplyTargetValidationErrorResponse(validationError);
      return res
        .status(replyTargetValidationError.status)
        .json({ data: null, error: replyTargetValidationError.error });
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

  return res.status(201).json({
    data: createdComment,
    error: null,
  });
}

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
    return handleGetComments(req, res, feedbackId);
  }

  if (req.method === "POST") {
    return handleCreateComment(req, res, feedbackId);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ data: null, error: "Method Not Allowed" });
}
