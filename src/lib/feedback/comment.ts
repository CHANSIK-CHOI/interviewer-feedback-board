import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { FeedbackPublicBase } from "@/types/feedback";
import type { FeedbackComment, FeedbackCommentRole, FeedbackCommentRow } from "@/types/feedback-comment";
import type { SupabaseError } from "@/types/common";
import type { SupabaseClient } from "@supabase/supabase-js";

export const mapFeedbackCommentRole = ({
  feedbackAuthorId,
  commentAuthorId,
}: {
  feedbackAuthorId: FeedbackPublicBase["author_id"];
  commentAuthorId: FeedbackCommentRow["author_id"];
}): FeedbackCommentRole => {
  return feedbackAuthorId === commentAuthorId ? "author" : "admin";
};

export const mapFeedbackComments = ({
  rows,
  feedbackAuthorId,
}: {
  rows: FeedbackCommentRow[];
  feedbackAuthorId: FeedbackPublicBase["author_id"];
}): FeedbackComment[] => {
  return rows.map((row) => ({
    id: row.id,
    feedbackId: row.feedback_id,
    parentCommentId: row.parent_comment_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at,
    role: mapFeedbackCommentRole({
      feedbackAuthorId,
      commentAuthorId: row.author_id,
    }),
  }));
};

export const getFeedbackComments = async ({
  supabaseClient,
  feedbackId,
  feedbackAuthorId,
}: {
  supabaseClient: SupabaseClient;
  feedbackId: FeedbackPublicBase["id"];
  feedbackAuthorId: FeedbackPublicBase["author_id"];
}): Promise<FeedbackComment[]> => {
  const { data, error }: { data: FeedbackCommentRow[] | null; error: SupabaseError } =
    await supabaseClient
      .from("feedback_comments")
      .select(
        "id, feedback_id, parent_comment_id, author_id, author_name, author_avatar_url, body, created_at, updated_at, edited_at"
      )
      .eq("feedback_id", feedbackId)
      .order("created_at", { ascending: true });

  if (error) {
    throw new Error(resolveSupabaseErrorMessage(error, "Failed fetch getFeedbackComments"));
  }

  return mapFeedbackComments({
    rows: data ?? [],
    feedbackAuthorId,
  });
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

  const { data, error }: { data: Pick<FeedbackCommentRow, "feedback_id">[] | null; error: SupabaseError } =
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
