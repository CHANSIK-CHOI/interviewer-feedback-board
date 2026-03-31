import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext } from "@/lib/auth/request";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import {
  FEEDBACK_COMMENT_COLUMNS,
  getFeedbackCommentById,
  getFeedbackCommentTarget,
  type FeedbackCommentTargetRow,
  validateCommentBody,
} from "@/lib/feedback/comment";
import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { SupabaseError } from "@/types/common";
import type { FeedbackCommentRow, FeedbackCommentUpdatePayload } from "@/types/feedback-comment";
import type { DeleteFeedbackCommentResponse, FeedbackCommentResponse } from "@/types/response";

type CommentOwnerRow = FeedbackCommentRow;

const COMMENT_UPDATE_ERROR_MESSAGE = "코멘트 수정에 실패했습니다.";
const COMMENT_DELETE_ERROR_MESSAGE = "코멘트 삭제에 실패했습니다.";

const normalizeCommentPayload = (body: Partial<FeedbackCommentUpdatePayload>) => {
  return typeof body.body === "string" ? body.body.trim() : "";
};

const revalidateFeedbackList = async (
  res: NextApiResponse<FeedbackCommentResponse | DeleteFeedbackCommentResponse>,
  action: "update" | "delete"
) => {
  try {
    await res.revalidate("/feedback");
  } catch (error) {
    console.warn(`Failed to revalidate /feedback after comment ${action}`, error);
  }
};

const loadCommentTargets = async ({
  supabaseServerAdminClient,
  feedbackId,
  commentId,
}: {
  supabaseServerAdminClient: NonNullable<ReturnType<typeof getSupabaseServerAdminClient>>;
  feedbackId: string;
  commentId: string;
}) => {
  const {
    data: feedbackRow,
    error: feedbackError,
  }: { data: FeedbackCommentTargetRow | null; error: SupabaseError } = await getFeedbackCommentTarget(
    {
      supabaseClient: supabaseServerAdminClient,
      feedbackId,
    }
  );

  if (feedbackError) {
    return { feedbackRow: null, feedbackError, commentRow: null, commentError: null };
  }

  if (!feedbackRow) {
    return { feedbackRow: null, feedbackError: null, commentRow: null, commentError: null };
  }

  const {
    data: commentRow,
    error: commentError,
  }: { data: CommentOwnerRow | null; error: SupabaseError } = await getFeedbackCommentById({
    supabaseClient: supabaseServerAdminClient,
    commentId,
  });

  return {
    feedbackRow,
    feedbackError: null,
    commentRow,
    commentError,
  };
};

async function handleUpdateComment(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackCommentResponse | DeleteFeedbackCommentResponse>,
  feedbackId: string,
  commentId: string
) {
  const auth = await getRequestAuthContext(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }
  const { supabaseServerUserClient, userId } = auth.context;

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const { feedbackRow, feedbackError, commentRow, commentError } = await loadCommentTargets({
    supabaseServerAdminClient,
    feedbackId,
    commentId,
  });

  if (feedbackError) {
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(feedbackError, COMMENT_UPDATE_ERROR_MESSAGE),
    });
  }

  if (!feedbackRow) {
    return res.status(404).json({ data: null, error: "피드백을 찾을 수 없습니다." });
  }

  if (commentError) {
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(commentError, COMMENT_UPDATE_ERROR_MESSAGE),
    });
  }

  if (!commentRow) {
    return res.status(404).json({ data: null, error: "코멘트를 찾을 수 없습니다." });
  }

  if (commentRow.feedback_id !== feedbackId) {
    return res.status(400).json({ data: null, error: "다른 피드백의 코멘트입니다." });
  }

  if (!feedbackRow.comments_unlocked_at) {
    return res
      .status(400)
      .json({ data: null, error: "코멘트는 첫 승인 이후부터 사용할 수 있습니다." });
  }

  if (feedbackRow.status !== "approved" || !feedbackRow.is_public) {
    return res.status(403).json({
      data: null,
      error: "현재는 승인된 공개 글에서만 코멘트를 수정할 수 있습니다.",
    });
  }

  if (commentRow.author_id !== userId) {
    return res.status(403).json({ data: null, error: "본인 코멘트만 수정할 수 있습니다." });
  }

  const body = normalizeCommentPayload(req.body ?? {});
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
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(updateError, COMMENT_UPDATE_ERROR_MESSAGE),
    });
  }

  await revalidateFeedbackList(res, "update");

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
  const auth = await getRequestAuthContext(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }
  const { isAdmin, supabaseServerUserClient, userId } = auth.context;

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const { feedbackRow, feedbackError, commentRow, commentError } = await loadCommentTargets({
    supabaseServerAdminClient,
    feedbackId,
    commentId,
  });

  if (feedbackError) {
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(feedbackError, COMMENT_DELETE_ERROR_MESSAGE),
    });
  }

  if (!feedbackRow) {
    return res.status(404).json({ data: null, error: "피드백을 찾을 수 없습니다." });
  }

  if (commentError) {
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(commentError, COMMENT_DELETE_ERROR_MESSAGE),
    });
  }

  if (!commentRow) {
    return res.status(404).json({ data: null, error: "코멘트를 찾을 수 없습니다." });
  }

  if (commentRow.feedback_id !== feedbackId) {
    return res.status(400).json({ data: null, error: "다른 피드백의 코멘트입니다." });
  }

  if (!isAdmin) {
    if (commentRow.author_id !== userId) {
      return res.status(403).json({ data: null, error: "본인 코멘트만 삭제할 수 있습니다." });
    }

    if (
      !feedbackRow.comments_unlocked_at ||
      feedbackRow.status !== "approved" ||
      !feedbackRow.is_public
    ) {
      return res.status(403).json({
        data: null,
        error: "현재는 승인된 공개 글에서만 본인 코멘트를 삭제할 수 있습니다.",
      });
    }
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
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(deleteError, COMMENT_DELETE_ERROR_MESSAGE),
    });
  }

  await revalidateFeedbackList(res, "delete");

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
