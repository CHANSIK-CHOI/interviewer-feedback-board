import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import type { FeedbackPublicBase } from "@/types/feedback";
import type { FeedbackComment, FeedbackCommentRow } from "@/types/feedback-comment";
import type { SupabaseError } from "@/types/common";
import type { SupabaseClient } from "@supabase/supabase-js";

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
      .select(
        "id, feedback_id, parent_comment_id, author_id, author_name, author_avatar_url, body, created_at, updated_at, edited_at"
      )
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
