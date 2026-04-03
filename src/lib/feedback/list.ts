import type {
  AdminReviewFeedback,
  ApprovedFeedback,
  FeedbackListItem,
  FeedbackPublicBase,
  OwnerFeedback,
  RevisedPendingPreviewFeedback,
} from "@/types/feedback";

type WithUpdatedAt = { updated_at?: FeedbackPublicBase["updated_at"] | null };

export const compareUpdatedAtDesc = (a: WithUpdatedAt, b: WithUpdatedAt) => {
  if (!a.updated_at || !b.updated_at) {
    console.error("compareUpdatedAtDesc: missing updated_at", { a, b });
    return 0;
  }

  const aTime = new Date(a.updated_at).getTime();
  const bTime = new Date(b.updated_at).getTime();

  if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
    console.error("compareUpdatedAtDesc: invalid updated_at", { a, b });
    return 0;
  }

  return bTime - aTime;
};

export type MergeFeedbackListParams = {
  approved: ApprovedFeedback[];
  revisedPreview: RevisedPendingPreviewFeedback[];
  mine: OwnerFeedback[];
  adminReview: AdminReviewFeedback[];
};

export const mergeFeedbackList = ({
  approved,
  revisedPreview,
  mine,
  adminReview,
}: MergeFeedbackListParams): FeedbackListItem[] => {
  const mergedById = new Map<string, FeedbackListItem>();

  [...approved, ...revisedPreview].forEach((publicItem) => {
    mergedById.set(publicItem.id, publicItem);
  });

  if (adminReview.length === 0) {
    mine.forEach((ownerItem) => {
      mergedById.set(ownerItem.id, ownerItem);
    });
  } else {
    adminReview.forEach((adminItem) => {
      mergedById.set(adminItem.id, adminItem);
    });
  }

  return Array.from(mergedById.values()).sort(compareUpdatedAtDesc);
};

export const hasFeedbackBeenUpdated = ({
  created_at,
  updated_at,
}: {
  created_at: FeedbackPublicBase["created_at"];
  updated_at: FeedbackPublicBase["updated_at"];
}) => {
  return created_at !== updated_at;
};
