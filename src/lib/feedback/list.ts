import { UseFeedbackBoardResult } from "@/hooks/feedback/useFeedbackBoardData";
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
  mine: UseFeedbackBoardResult<OwnerFeedback[]>;
  adminReview: UseFeedbackBoardResult<AdminReviewFeedback[]>;
  hasAdminRole: boolean;
};

export type FeedbackListStatus = {
  isLoading?: boolean;
  isFail?: boolean;
  id: string;
  statusType?: "loading" | "fail";
};

export type MergeFeedbackListResult = {
  mergedFeedbacks: FeedbackListItem[];
  mergedFeedbackStatus: FeedbackListStatus[];
};

export const mergeFeedbackList = ({
  approved,
  revisedPreview,
  mine,
  adminReview,
  hasAdminRole,
}: MergeFeedbackListParams): MergeFeedbackListResult => {
  const mergedById = new Map<string, FeedbackListItem>();
  const mergedByStatus = new Map<string, FeedbackListStatus>();

  [...approved, ...revisedPreview].forEach((publicItem) => {
    mergedById.set(publicItem.id, publicItem);
  });

  // 관리자가 아닐 때
  if (!hasAdminRole) {
    if (mine.isLoading) {
      mergedByStatus.set("mine", {
        isLoading: mine.isLoading,
        id: "mineLoading",
        statusType: "loading",
      });
    } else if (mine.isFail) {
      mergedByStatus.set("mine", {
        isFail: mine.isFail,
        id: "mineFail",
        statusType: "fail",
      });
    } else {
      mergedByStatus.delete("mine");
      mine.data.forEach((ownerItem) => {
        mergedById.set(ownerItem.id, ownerItem);
      });
    }
  }
  // 관리자일 때
  else {
    if (adminReview.isLoading) {
      mergedByStatus.set("adminReview", {
        isLoading: adminReview.isLoading,
        id: "adminReviewLoading",
        statusType: "loading",
      });
    } else if (adminReview.isFail) {
      mergedByStatus.set("adminReview", {
        isFail: adminReview.isFail,
        id: "adminReviewFail",
        statusType: "fail",
      });
    } else {
      mergedByStatus.delete("adminReview");
      adminReview.data.forEach((adminItem) => {
        mergedById.set(adminItem.id, adminItem);
      });
    }
  }

  return {
    mergedFeedbacks: Array.from(mergedById.values()).sort(compareUpdatedAtDesc),
    mergedFeedbackStatus: Array.from(mergedByStatus.values()),
  };
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
