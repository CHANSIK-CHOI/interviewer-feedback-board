import type { NextApiRequest, NextApiResponse } from "next";
import type { AuthContext } from "@/lib/auth/server";
import { resolveApiRequestAuth } from "@/lib/auth/request";
import {
  getSupabaseServerAdminClient,
  getSupabaseServerAnonClient,
  resolveSupabaseServerReader,
} from "@/lib/supabase/server";
import {
  FEEDBACK_COMMENT_COLUMNS,
  findFeedbackCommentsFeedbackTarget,
  listFeedbackComments,
  normalizeCreateFeedbackCommentPayload,
  type FeedbackCommentReplyTargetValidationError,
  type FeedbackCommentsFeedbackTargetRow,
  validateCommentBody,
  validateFeedbackCommentReplyTarget,
} from "@/lib/feedback/comment";
import { getAvatarUrl, getUserName } from "@/lib/user/profile";
import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { FeedbackCommentRow } from "@/types/feedback-comment";
import type { FeedbackCommentListResponse, FeedbackCommentResponse } from "@/types/response";
import type { SupabaseError } from "@/types/common";
import type { SupabaseClient } from "@supabase/supabase-js";

const COMMENT_CREATE_ERROR_MESSAGE = "코멘트 등록에 실패했습니다.";
const COMMENT_READ_ERROR_MESSAGE = "댓글 조회에 실패했습니다.";

type CommentApiError = {
  status: number;
  error: string;
};

type FeedbackCommentTargetResult = {
  supabaseServerAdminClient: SupabaseClient | null;
  feedback: FeedbackCommentsFeedbackTargetRow | null;
  errorResponse: CommentApiError | null;
};

const resolveReplyTargetValidationErrorResponse = (
  validationError: FeedbackCommentReplyTargetValidationError
): CommentApiError => {
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

const canEveryoneReadComments = (feedback: FeedbackCommentsFeedbackTargetRow) =>
  Boolean(feedback.comments_unlocked_at) && feedback.status === "approved" && feedback.is_public;

const loadFeedbackCommentTarget = async (
  feedbackId: string,
  errorMessage: string
): Promise<FeedbackCommentTargetResult> => {
  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return {
      supabaseServerAdminClient: null,
      feedback: null,
      errorResponse: {
        status: 500,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      },
    };
  }

  const {
    data: feedback,
    error,
  }: { data: FeedbackCommentsFeedbackTargetRow | null; error: SupabaseError } =
    await findFeedbackCommentsFeedbackTarget({
      supabaseClient: supabaseServerAdminClient,
      feedbackId,
    });

  if (error) {
    return {
      supabaseServerAdminClient,
      feedback: null,
      errorResponse: {
        status: 500,
        error: resolveSupabaseErrorMessage(error, errorMessage),
      },
    };
  }

  if (!feedback) {
    return {
      supabaseServerAdminClient,
      feedback: null,
      errorResponse: { status: 404, error: "피드백을 찾을 수 없습니다." },
    };
  }

  return {
    supabaseServerAdminClient,
    feedback,
    errorResponse: null,
  };
};

const resolveOptionalApiAuthContext = async (req: NextApiRequest): Promise<AuthContext | null> => {
  const authHeader = req.headers.authorization;
  const hasBearerAccessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  if (!hasBearerAccessToken) {
    return null;
  }

  const auth = await resolveApiRequestAuth(req);
  return auth.context ?? null;
};

const resolveReadableCommentsClient = (authContext: AuthContext | null) =>
  resolveSupabaseServerReader({
    supabaseServerUserClient: authContext?.supabaseServerUserClient ?? null,
    supabaseServerAnonClient: getSupabaseServerAnonClient(),
  });

const resolveCommentReadPolicyError = (
  feedback: FeedbackCommentsFeedbackTargetRow,
  isAuthenticatedRequester: boolean
): CommentApiError | null => {
  if (!isAuthenticatedRequester && !canEveryoneReadComments(feedback)) {
    return { status: 404, error: "피드백을 찾을 수 없습니다." };
  }

  return null;
};

const resolveCommentCreatePolicyError = (
  feedback: FeedbackCommentsFeedbackTargetRow,
  userId: string,
  isAdmin: boolean
): CommentApiError | null => {
  if (!feedback.comments_unlocked_at) {
    return {
      status: 400,
      error: "코멘트는 첫 승인 이후부터 사용할 수 있습니다.",
    };
  }

  if (!canEveryoneReadComments(feedback)) {
    return {
      status: 403,
      error: "현재는 승인된 공개 글에서만 코멘트를 작성할 수 있습니다.",
    };
  }

  if (!isAdmin && feedback.author_id !== userId) {
    return {
      status: 403,
      error: "코멘트 작성 권한이 없습니다.",
    };
  }

  return null;
};

async function handleGetComments(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentListResponse | FeedbackCommentResponse>,
  feedbackId: string
) {
  const { feedback, errorResponse } = await loadFeedbackCommentTarget(
    feedbackId,
    COMMENT_READ_ERROR_MESSAGE
  );
  if (errorResponse || !feedback) {
    return res
      .status(errorResponse?.status ?? 404)
      .json({ data: null, error: errorResponse?.error ?? "피드백을 찾을 수 없습니다." });
  }

  const authContext = await resolveOptionalApiAuthContext(req);
  const readableSupabaseServerClient = resolveReadableCommentsClient(authContext);
  const isAuthenticatedRequester = Boolean(authContext);
  if (!readableSupabaseServerClient) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
  }

  const readPolicyError = resolveCommentReadPolicyError(feedback, isAuthenticatedRequester);
  if (readPolicyError) {
    return res.status(readPolicyError.status).json({ data: null, error: readPolicyError.error });
  }

  try {
    const comments = await listFeedbackComments({
      supabaseClient: readableSupabaseServerClient,
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
  const auth = await resolveApiRequestAuth(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }
  const { authData, isAdmin, supabaseServerUserClient, userId } = auth.context;

  const { supabaseServerAdminClient, feedback, errorResponse } = await loadFeedbackCommentTarget(
    feedbackId,
    COMMENT_CREATE_ERROR_MESSAGE
  );
  if (errorResponse || !feedback) {
    return res
      .status(errorResponse?.status ?? 404)
      .json({ data: null, error: errorResponse?.error ?? "피드백을 찾을 수 없습니다." });
  }

  const createPolicyError = resolveCommentCreatePolicyError(feedback, userId, isAdmin);
  if (createPolicyError) {
    return res
      .status(createPolicyError.status)
      .json({ data: null, error: createPolicyError.error });
  }

  const { body, parentCommentId } = normalizeCreateFeedbackCommentPayload(req.body ?? {});
  const bodyValidationError = validateCommentBody(body);
  if (bodyValidationError) {
    return res.status(400).json({ data: null, error: bodyValidationError });
  }

  if (parentCommentId) {
    if (!supabaseServerAdminClient) {
      return res
        .status(500)
        .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

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
