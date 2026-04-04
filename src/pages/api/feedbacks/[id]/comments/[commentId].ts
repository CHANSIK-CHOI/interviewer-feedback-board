import type { NextApiRequest, NextApiResponse } from "next";
import { resolveApiRequestAuth } from "@/lib/auth/request";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import {
  FEEDBACK_COMMENT_COLUMNS,
  type FeedbackCommentsFeedbackTargetRow,
  findFeedbackCommentMutationTarget,
  normalizeFeedbackCommentBody,
  validateCommentBody,
} from "@/lib/feedback/comment";
import type { SupabaseError } from "@/types/common";
import type { FeedbackCommentRow } from "@/types/feedback-comment";
import type { DeleteFeedbackCommentResponse, FeedbackCommentResponse } from "@/types/response";

const COMMENT_UPDATE_ERROR_MESSAGE = "코멘트 수정에 실패했습니다.";
const COMMENT_DELETE_ERROR_MESSAGE = "코멘트 삭제에 실패했습니다.";

type CommentApiError = {
  status: number;
  error: string;
};

type CommentMutationTargetResult = {
  feedback: FeedbackCommentsFeedbackTargetRow | null;
  comment: FeedbackCommentRow | null;
  errorResponse: CommentApiError | null;
};

const canManageCommentsOnPublicApprovedFeedback = (feedback: FeedbackCommentsFeedbackTargetRow) =>
  Boolean(feedback.comments_unlocked_at) && feedback.status === "approved" && feedback.is_public;

const loadCommentMutationTarget = async (
  feedbackId: string,
  commentId: string,
  errorMessage: string
): Promise<CommentMutationTargetResult> => {
  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return {
      feedback: null,
      comment: null,
      errorResponse: {
        status: 500,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      },
    };
  }

  const { feedback, feedbackError, comment, commentError } =
    await findFeedbackCommentMutationTarget({
      supabaseClient: supabaseServerAdminClient,
      feedbackId,
      commentId,
    });

  if (feedbackError) {
    const feedbackErrorMessage = feedbackError.message?.trim();
    return {
      feedback: null,
      comment: null,
      errorResponse: {
        status: 500,
        error: feedbackErrorMessage ? `${errorMessage}: ${feedbackErrorMessage}` : errorMessage,
      },
    };
  }

  if (!feedback) {
    return {
      feedback: null,
      comment: null,
      errorResponse: { status: 404, error: "피드백을 찾을 수 없습니다." },
    };
  }

  if (commentError) {
    const commentErrorMessage = commentError.message?.trim();
    return {
      feedback,
      comment: null,
      errorResponse: {
        status: 500,
        error: commentErrorMessage ? `${errorMessage}: ${commentErrorMessage}` : errorMessage,
      },
    };
  }

  if (!comment) {
    return {
      feedback,
      comment: null,
      errorResponse: { status: 404, error: "코멘트를 찾을 수 없습니다." },
    };
  }

  if (comment.feedback_id !== feedbackId) {
    return {
      feedback,
      comment,
      errorResponse: { status: 400, error: "다른 피드백의 코멘트입니다." },
    };
  }

  return {
    feedback,
    comment,
    errorResponse: null,
  };
};

const resolveCommentUpdatePolicyError = (
  feedback: FeedbackCommentsFeedbackTargetRow,
  comment: FeedbackCommentRow,
  userId: string
): CommentApiError | null => {
  if (!feedback.comments_unlocked_at) {
    return {
      status: 400,
      error: "코멘트는 첫 승인 이후부터 사용할 수 있습니다.",
    };
  }

  if (!canManageCommentsOnPublicApprovedFeedback(feedback)) {
    return {
      status: 403,
      error: "현재는 승인된 공개 글에서만 코멘트를 수정할 수 있습니다.",
    };
  }

  if (comment.author_id !== userId) {
    return {
      status: 403,
      error: "본인 코멘트만 수정할 수 있습니다.",
    };
  }

  return null;
};

const resolveCommentDeletePolicyError = (
  feedback: FeedbackCommentsFeedbackTargetRow,
  comment: FeedbackCommentRow,
  userId: string,
  isAdmin: boolean
): CommentApiError | null => {
  if (isAdmin) {
    return null;
  }

  if (comment.author_id !== userId) {
    return {
      status: 403,
      error: "본인 코멘트만 삭제할 수 있습니다.",
    };
  }

  if (!canManageCommentsOnPublicApprovedFeedback(feedback)) {
    return {
      status: 403,
      error: "현재는 승인된 공개 글에서만 본인 코멘트를 삭제할 수 있습니다.",
    };
  }

  return null;
};

async function handleUpdateComment(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentResponse | DeleteFeedbackCommentResponse>,
  feedbackId: string,
  commentId: string
) {
  const auth = await resolveApiRequestAuth(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }
  const { supabaseServerUserClient, userId } = auth.context;

  const { comment, errorResponse, feedback } = await loadCommentMutationTarget(
    feedbackId,
    commentId,
    COMMENT_UPDATE_ERROR_MESSAGE
  );
  if (errorResponse || !feedback || !comment) {
    return res
      .status(errorResponse?.status ?? 404)
      .json({ data: null, error: errorResponse?.error ?? "코멘트를 찾을 수 없습니다." });
  }

  const updatePolicyError = resolveCommentUpdatePolicyError(feedback, comment, userId);
  if (updatePolicyError) {
    return res.status(updatePolicyError.status).json({ data: null, error: updatePolicyError.error });
  }

  const body = normalizeFeedbackCommentBody(req.body?.body);
  const bodyValidationError = validateCommentBody(body);
  if (bodyValidationError) {
    return res.status(400).json({ data: null, error: bodyValidationError });
  }

  const {
    data: updatedComment,
    error: updateError,
  }: { data: FeedbackCommentRow | null; error: SupabaseError } = await supabaseServerUserClient
    .from("feedback_comments")
    .update({ body })
    .eq("id", commentId)
    .select(FEEDBACK_COMMENT_COLUMNS)
    .maybeSingle();

  if (updateError || !updatedComment) {
    const errorMessage = updateError?.message?.trim();
    return res.status(500).json({
      data: null,
      error: errorMessage
        ? `${COMMENT_UPDATE_ERROR_MESSAGE}: ${errorMessage}`
        : COMMENT_UPDATE_ERROR_MESSAGE,
    });
  }

  return res.status(200).json({
    data: updatedComment,
    error: null,
  });
}

async function handleDeleteComment(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentResponse | DeleteFeedbackCommentResponse>,
  feedbackId: string,
  commentId: string
) {
  const auth = await resolveApiRequestAuth(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }
  const { isAdmin, supabaseServerUserClient, userId } = auth.context;

  const { comment, errorResponse, feedback } = await loadCommentMutationTarget(
    feedbackId,
    commentId,
    COMMENT_DELETE_ERROR_MESSAGE
  );
  if (errorResponse || !feedback || !comment) {
    return res
      .status(errorResponse?.status ?? 404)
      .json({ data: null, error: errorResponse?.error ?? "코멘트를 찾을 수 없습니다." });
  }

  const deletePolicyError = resolveCommentDeletePolicyError(
    feedback,
    comment,
    userId,
    isAdmin
  );
  if (deletePolicyError) {
    return res.status(deletePolicyError.status).json({ data: null, error: deletePolicyError.error });
  }

  const {
    data: deletedComment,
    error: deleteError,
  }: { data: Pick<FeedbackCommentRow, "id"> | null; error: SupabaseError } =
    await supabaseServerUserClient
      .from("feedback_comments")
      .delete()
      .eq("id", commentId)
      .select("id")
      .maybeSingle();

  if (deleteError || !deletedComment) {
    const errorMessage = deleteError?.message?.trim();
    return res.status(500).json({
      data: null,
      error: errorMessage
        ? `${COMMENT_DELETE_ERROR_MESSAGE}: ${errorMessage}`
        : COMMENT_DELETE_ERROR_MESSAGE,
    });
  }

  return res.status(200).json({
    data: {
      id: deletedComment.id,
    },
    error: null,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentResponse | DeleteFeedbackCommentResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", ["PATCH", "DELETE"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const feedbackId = req.query.id;
  const commentId = req.query.commentId;

  if (typeof feedbackId !== "string" || typeof commentId !== "string") {
    return res.status(400).json({ data: null, error: "Invalid request target" });
  }

  if (req.method === "PATCH") {
    return handleUpdateComment(req, res, feedbackId, commentId);
  }

  if (req.method === "DELETE") {
    return handleDeleteComment(req, res, feedbackId, commentId);
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  return res.status(405).json({ data: null, error: "Method Not Allowed" });
}
