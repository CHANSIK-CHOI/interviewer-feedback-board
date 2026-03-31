import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { FeedbackPublicBase } from "@/types/feedback";
import type { FeedbackComment, FeedbackCommentRow } from "@/types/feedback-comment";
import type { SupabaseError } from "@/types/common";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedbackCommentTargetRow = {
  id: FeedbackPublicBase["id"];
  author_id: FeedbackPublicBase["author_id"];
  status: "pending" | "approved" | "rejected" | "revised_pending";
  is_public: boolean;
  comments_unlocked_at: string | null;
};

export type FeedbackCommentParentRow = Pick<
  FeedbackCommentRow,
  "id" | "feedback_id" | "parent_comment_id"
>;

export const FEEDBACK_COMMENT_COLUMNS =
  "id, feedback_id, parent_comment_id, author_id, author_name, author_avatar_url, body, created_at, updated_at, edited_at";

export const validateCommentBody = (body: string) => {
  if (!body) {
    return "코멘트 내용을 입력해주세요.";
  }

  if (body.length > 1000) {
    return "코멘트는 1000자 이하로 작성해주세요.";
  }

  return null;
};

export const getFeedbackCommentTarget = async ({
  supabaseClient,
  feedbackId,
}: {
  supabaseClient: SupabaseClient;
  feedbackId: FeedbackPublicBase["id"];
}): Promise<{ data: FeedbackCommentTargetRow | null; error: SupabaseError }> => {
  return await supabaseClient
    .from("feedbacks")
    .select("id, author_id, status, is_public, comments_unlocked_at")
    .eq("id", feedbackId)
    .maybeSingle();
};

export const getFeedbackCommentParent = async ({
  supabaseClient,
  parentCommentId,
}: {
  supabaseClient: SupabaseClient;
  parentCommentId: FeedbackCommentParentRow["id"];
}): Promise<{ data: FeedbackCommentParentRow | null; error: SupabaseError }> => {
  return await supabaseClient
    .from("feedback_comments")
    .select("id, feedback_id, parent_comment_id")
    .eq("id", parentCommentId)
    .maybeSingle();
};

export const getFeedbackCommentById = async ({
  supabaseClient,
  commentId,
}: {
  supabaseClient: SupabaseClient;
  commentId: FeedbackCommentRow["id"];
}): Promise<{ data: FeedbackCommentRow | null; error: SupabaseError }> => {
  return await supabaseClient
    .from("feedback_comments")
    .select(FEEDBACK_COMMENT_COLUMNS)
    .eq("id", commentId)
    .maybeSingle();
};

export const getFeedbackComments = async ({
  supabaseClient,
  feedbackId,
}: {
  supabaseClient: SupabaseClient;
  feedbackId: FeedbackPublicBase["id"];
}): Promise<FeedbackComment[]> => {
  const { data, error }: { data: FeedbackCommentRow[] | null; error: SupabaseError } =
    await supabaseClient
      .from("feedback_comments")
      .select(FEEDBACK_COMMENT_COLUMNS)
      .eq("feedback_id", feedbackId)
      .order("created_at", { ascending: true });

  if (error) {
    throw new Error(resolveSupabaseErrorMessage(error, "Failed fetch getFeedbackComments"));
  }

  return data ?? [];
};

export const getFeedbackCommentCounts = async ({
  supabaseClient,
  feedbackIds,
}: {
  supabaseClient: SupabaseClient;
  feedbackIds: FeedbackPublicBase["id"][];
}): Promise<Record<string, number>> => {
  if (feedbackIds.length === 0) {
    return {};
  }

  const {
    data,
    error,
  }: { data: Pick<FeedbackCommentRow, "feedback_id">[] | null; error: SupabaseError } =
    await supabaseClient
      .from("feedback_comments")
      .select("feedback_id")
      .in("feedback_id", feedbackIds);

  if (error) {
    throw new Error(resolveSupabaseErrorMessage(error, "Failed fetch getFeedbackCommentCounts"));
  }

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.feedback_id] = (acc[row.feedback_id] ?? 0) + 1;
    return acc;
  }, {});
};
