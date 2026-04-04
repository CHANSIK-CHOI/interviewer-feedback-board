import type { FeedbackPublicBase } from "@/types/feedback";
import type {
  FeedbackComment,
  FeedbackCommentCreatePayload,
  FeedbackCommentRow,
} from "@/types/feedback-comment";
import type { SupabaseError } from "@/types/common";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedbackCommentsFeedbackTargetRow = {
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

export type FeedbackCommentReplyTargetValidationError =
  | "PARENT_NOT_FOUND"
  | "DIFFERENT_FEEDBACK"
  | "NESTED_REPLY_NOT_ALLOWED";

export type FeedbackCommentMutationTarget = {
  feedback: FeedbackCommentsFeedbackTargetRow | null;
  feedbackError: SupabaseError;
  comment: FeedbackCommentRow | null;
  commentError: SupabaseError;
};

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

export const normalizeFeedbackCommentBody = (body: unknown) => {
  return typeof body === "string" ? body.trim() : "";
};

export const normalizeCreateFeedbackCommentPayload = (
  payload: Partial<FeedbackCommentCreatePayload>
) => {
  const body = normalizeFeedbackCommentBody(payload.body);
  const parentCommentId =
    typeof payload.parentCommentId === "string" && payload.parentCommentId.trim()
      ? payload.parentCommentId.trim()
      : null;

  return {
    body,
    parentCommentId,
  };
};

export const findFeedbackCommentsFeedbackTarget = async ({
  supabaseClient,
  feedbackId,
}: {
  supabaseClient: SupabaseClient;
  feedbackId: FeedbackPublicBase["id"];
}): Promise<{ data: FeedbackCommentsFeedbackTargetRow | null; error: SupabaseError }> => {
  return await supabaseClient
    .from("feedbacks")
    .select("id, author_id, status, is_public, comments_unlocked_at")
    .eq("id", feedbackId)
    .maybeSingle();
};

export const findFeedbackCommentParent = async ({
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

export const validateFeedbackCommentReplyTarget = async ({
  supabaseClient,
  feedbackId,
  parentCommentId,
}: {
  supabaseClient: SupabaseClient;
  feedbackId: FeedbackPublicBase["id"];
  parentCommentId: FeedbackCommentParentRow["id"];
}): Promise<{
  validationError: FeedbackCommentReplyTargetValidationError | null;
  error: SupabaseError;
}> => {
  const { data: parentRow, error } = await findFeedbackCommentParent({
    supabaseClient,
    parentCommentId,
  });

  if (error) {
    return {
      validationError: null,
      error,
    };
  }

  if (!parentRow) {
    return {
      validationError: "PARENT_NOT_FOUND",
      error: null,
    };
  }

  if (parentRow.feedback_id !== feedbackId) {
    return {
      validationError: "DIFFERENT_FEEDBACK",
      error: null,
    };
  }

  if (parentRow.parent_comment_id) {
    return {
      validationError: "NESTED_REPLY_NOT_ALLOWED",
      error: null,
    };
  }

  return {
    validationError: null,
    error: null,
  };
};

export const findFeedbackCommentById = async ({
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

export const findFeedbackCommentMutationTarget = async ({
  supabaseClient,
  feedbackId,
  commentId,
}: {
  supabaseClient: SupabaseClient;
  feedbackId: FeedbackPublicBase["id"];
  commentId: FeedbackCommentRow["id"];
}): Promise<FeedbackCommentMutationTarget> => {
  const {
    data: feedback,
    error: feedbackError,
  }: { data: FeedbackCommentsFeedbackTargetRow | null; error: SupabaseError } =
    await findFeedbackCommentsFeedbackTarget(
    {
      supabaseClient,
      feedbackId,
    }
  );

  if (feedbackError) {
    return {
      feedback: null,
      feedbackError,
      comment: null,
      commentError: null,
    };
  }

  if (!feedback) {
    return {
      feedback: null,
      feedbackError: null,
      comment: null,
      commentError: null,
    };
  }

  const {
    data: comment,
    error: commentError,
  }: { data: FeedbackCommentRow | null; error: SupabaseError } = await findFeedbackCommentById(
    {
      supabaseClient,
      commentId,
    }
  );

  return {
    feedback,
    feedbackError: null,
    comment,
    commentError,
  };
};

export const listFeedbackComments = async ({
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
    const errorMessage = error.message?.trim();
    throw new Error(
      errorMessage ? `Failed fetch listFeedbackComments: ${errorMessage}` : "Failed fetch listFeedbackComments"
    );
  }

  return data ?? [];
};

export const countFeedbackCommentsByFeedbackIds = async ({
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
    const errorMessage = error.message?.trim();
    throw new Error(
      errorMessage
        ? `Failed fetch countFeedbackCommentsByFeedbackIds: ${errorMessage}`
        : "Failed fetch countFeedbackCommentsByFeedbackIds"
    );
  }

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.feedback_id] = (acc[row.feedback_id] ?? 0) + 1;
    return acc;
  }, {});
};
