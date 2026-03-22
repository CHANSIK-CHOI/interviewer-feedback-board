export type FeedbackPublicBase = {
  id: string;
  author_id: string;
  display_name: string;
  company_name: string | null;
  is_company_public: boolean;
  avatar_url: string | null;
  is_public: boolean;
  revision_count: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type FeedbackPublicRow = FeedbackPublicBase & {
  summary: string;
  strengths: string | null;
  questions: string | null;
  suggestions: string | null;
  rating: number;
  tags: string[];
  status: "pending" | "approved" | "rejected" | "revised_pending";
};

export type FeedbackPublicAndEmailRow = FeedbackPublicRow & {
  email?: string;
};

export type ApprovedFeedback = FeedbackPublicBase & {
  status: "approved";
  isPreview: false;
  summary: string;
  strengths: string | null;
  questions: string | null;
  suggestions: string | null;
  rating: number;
  tags: string[];
};

export type RevisedPendingPreviewFeedback = FeedbackPublicBase & {
  status: "revised_pending";
  isPreview: true;
};

export type RevisedPendingOwnerFeedback = FeedbackPublicBase & {
  status: "revised_pending" | "pending";
  isPreview: false;
  summary: string;
  strengths: string | null;
  questions: string | null;
  suggestions: string | null;
  rating: number;
  tags: string[];
};

type AdminReviewBase = FeedbackPublicAndEmailRow & {
  isPreview: false;
};

export type AdminReviewFeedback = Omit<AdminReviewBase, "email">;

export type FeedbackListItem =
  | ApprovedFeedback
  | RevisedPendingPreviewFeedback
  | RevisedPendingOwnerFeedback
  | AdminReviewFeedback;
