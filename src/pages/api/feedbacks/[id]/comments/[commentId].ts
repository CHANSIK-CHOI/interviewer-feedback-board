import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext } from "@/lib/auth/request";
import { mapFeedbackComments } from "@/lib/feedback/comment";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { SupabaseError } from "@/types/common";
import type { FeedbackPublicBase } from "@/types/feedback";
import type {
  FeedbackCommentRow,
  FeedbackCommentUpdatePayload,
} from "@/types/feedback-comment";
import type {
  DeleteFeedbackCommentResponse,
  FeedbackCommentResponse,
} from "@/types/response";

type FeedbackCommentTargetRow = {
  id: FeedbackPublicBase["id"];
  author_id: FeedbackPublicBase["author_id"];
  status: "pending" | "approved" | "rejected" | "revised_pending";
  is_public: boolean;
  comments_unlocked_at: string | null;
};

type CommentOwnerRow = FeedbackCommentRow;

const FEEDBACK_COMMENT_COLUMNS =
  "id, feedback_id, parent_comment_id, author_id, author_name, author_avatar_url, body, created_at, updated_at, edited_at";

const COMMENT_UPDATE_ERROR_MESSAGE = "코멘트 수정에 실패했습니다.";
const COMMENT_DELETE_ERROR_MESSAGE = "코멘트 삭제에 실패했습니다.";

const normalizeCommentPayload = (body: Partial<FeedbackCommentUpdatePayload>) => {
  return typeof body.body === "string" ? body.body.trim() : "";
};

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

  const auth = await getRequestAuthContext(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return res
      .status(500)
      .json({ data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const {
    data: feedbackRow,
    error: feedbackError,
  }: { data: FeedbackCommentTargetRow | null; error: SupabaseError } = await supabaseServerAdminClient
    .from("feedbacks")
    .select("id, author_id, status, is_public, comments_unlocked_at")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError) {
    const fallbackMessage =
      req.method === "PATCH" ? COMMENT_UPDATE_ERROR_MESSAGE : COMMENT_DELETE_ERROR_MESSAGE;
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(feedbackError, fallbackMessage),
    });
  }

  if (!feedbackRow) {
    return res.status(404).json({ data: null, error: "피드백을 찾을 수 없습니다." });
  }

  const {
    data: commentRow,
    error: commentError,
  }: { data: CommentOwnerRow | null; error: SupabaseError } = await supabaseServerAdminClient
    .from("feedback_comments")
    .select(FEEDBACK_COMMENT_COLUMNS)
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) {
    const fallbackMessage =
      req.method === "PATCH" ? COMMENT_UPDATE_ERROR_MESSAGE : COMMENT_DELETE_ERROR_MESSAGE;
    return res.status(500).json({
      data: null,
      error: resolveSupabaseErrorMessage(commentError, fallbackMessage),
    });
  }

  if (!commentRow) {
    return res.status(404).json({ data: null, error: "코멘트를 찾을 수 없습니다." });
  }

  if (commentRow.feedback_id !== feedbackId) {
    return res.status(400).json({ data: null, error: "다른 피드백의 코멘트입니다." });
  }

  if (req.method === "PATCH") {
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

    if (commentRow.author_id !== auth.context.userId) {
      return res.status(403).json({ data: null, error: "본인 코멘트만 수정할 수 있습니다." });
    }

    const body = normalizeCommentPayload(req.body ?? {});
    if (!body) {
      return res.status(400).json({ data: null, error: "코멘트 내용을 입력해주세요." });
    }

    if (body.length > 1000) {
      return res.status(400).json({ data: null, error: "코멘트는 1000자 이하로 작성해주세요." });
    }

    const {
      data: updatedComment,
      error: updateError,
    }: { data: FeedbackCommentRow | null; error: SupabaseError } =
      await auth.context.supabaseServerUserClient
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

    try {
      await res.revalidate("/feedback");
    } catch (error) {
      console.warn("Failed to revalidate /feedback after comment update", error);
    }

    return res.status(200).json({
      data: mapFeedbackComments({
        rows: [updatedComment],
        feedbackAuthorId: feedbackRow.author_id,
      })[0],
      error: null,
    });
  }

  if (!auth.context.isAdmin) {
    if (commentRow.author_id !== auth.context.userId) {
      return res.status(403).json({ data: null, error: "본인 코멘트만 삭제할 수 있습니다." });
    }

    if (!feedbackRow.comments_unlocked_at || feedbackRow.status !== "approved" || !feedbackRow.is_public) {
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
    await auth.context.supabaseServerUserClient
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

  try {
    await res.revalidate("/feedback");
  } catch (error) {
    console.warn("Failed to revalidate /feedback after comment delete", error);
  }

  return res.status(200).json({
    data: {
      id: deletedComment.id,
    },
    error: null,
  });
}
