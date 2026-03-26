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

export type FeedbackComment = {
  id: string;
  feedbackId: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  role: FeedbackCommentRole;
};

export type FeedbackCommentCreatePayload = {
  body: string;
  parentCommentId?: string | null;
};

export type FeedbackCommentUpdatePayload = {
  body: string;
};
