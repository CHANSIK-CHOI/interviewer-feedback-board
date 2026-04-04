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
  comments_unlocked_at: string | null;
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

export type FeedbackPublicWithEmailRow = FeedbackPublicRow & {
  email: string;
};

export type ApprovedFeedback = FeedbackPublicBase & {
  status: "approved";
  isPreview: false;
  comment_count: number;
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

export type OwnerFeedback = FeedbackPublicBase & {
  status: "pending" | "revised_pending" | "rejected";
  isPreview: false;
  comment_count: number;
  summary: string;
  strengths: string | null;
  questions: string | null;
  suggestions: string | null;
  rating: number;
  tags: string[];
};

export type FeedbackDetailRow = FeedbackPublicRow & {
  email?: string;
};

export type ReviewFeedbackAction = "approve" | "reject" | "reopen";

export type ReviewFeedbackResult = {
  id: FeedbackPublicBase["id"];
  status: FeedbackPublicRow["status"];
  is_public: FeedbackPublicBase["is_public"];
  reviewed_at: FeedbackPublicBase["reviewed_at"];
  reviewed_by: FeedbackPublicBase["reviewed_by"];
};

export type ReviewFeedbackResultWithReviewerName = ReviewFeedbackResult & {
  reviewer_name: string | null;
};

type AdminReviewBase = FeedbackPublicWithEmailRow & {
  isPreview: false;
  comment_count: number;
};

export type AdminReviewFeedback = Omit<AdminReviewBase, "email">;

export type FeedbackListItem =
  | ApprovedFeedback
  | RevisedPendingPreviewFeedback
  | OwnerFeedback
  | AdminReviewFeedback;
