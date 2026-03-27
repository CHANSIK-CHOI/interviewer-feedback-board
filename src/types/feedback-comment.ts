export type FeedbackCommentRole = "author" | "admin";

export type FeedbackCommentRow = {
  id: string;
  feedback_id: string;
  parent_comment_id: string | null;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

export type FeedbackComment = FeedbackCommentRow;

export type FeedbackCommentCreatePayload = {
  body: string;
  parentCommentId?: string | null;
};

export type FeedbackCommentUpdatePayload = {
  body: string;
};
