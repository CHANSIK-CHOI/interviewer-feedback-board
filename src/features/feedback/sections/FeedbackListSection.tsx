import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FeedbackBox } from "@/components/feedback";
import type { FeedbackSortType } from "@/features/feedback/types";
import { compareUpdatedAtDesc, mergeFeedbackList } from "@/lib/feedback/list";
import type { ApprovedFeedback, RevisedPendingPreviewFeedback } from "@/types/feedback";
import FeedbackViewerData from "./FeedbackViewerData";

type FeedbackListSectionProps = {
  approvedFeedbacks: ApprovedFeedback[];
  revisedPendingPreviews: RevisedPendingPreviewFeedback[];
  sortType: FeedbackSortType;
  isAdminUi: boolean;
  isRoleLoading: boolean;
  sessionAccessToken: string | null;
  viewerId: string | null;
  supabaseClient: SupabaseClient | null;
};

export default function FeedbackListSection({
  approvedFeedbacks,
  revisedPendingPreviews,
  sortType,
  isAdminUi,
  isRoleLoading,
  sessionAccessToken,
  viewerId,
  supabaseClient,
}: FeedbackListSectionProps) {
  return (
    <FeedbackViewerData
      isAdminUi={isAdminUi}
      isRoleLoading={isRoleLoading}
      sessionAccessToken={sessionAccessToken}
      supabaseClient={supabaseClient}
      viewerId={viewerId}
    >
      {({ ownerPendingFeedbacks, adminReviewFeedbacks }) => {
        const feedbackData = mergeFeedbackList({
          approved: approvedFeedbacks,
          revisedPreview: revisedPendingPreviews,
          revisedMine: ownerPendingFeedbacks,
          adminReview: adminReviewFeedbacks,
        });

        const sortedFeedbackData = [...feedbackData].sort((a, b) =>
          sortType === "updated_desc" ? compareUpdatedAtDesc(a, b) : compareUpdatedAtDesc(b, a)
        );

        return (
          <section className="grid gap-4">
            {sortedFeedbackData.map((item) => (
              <FeedbackBox data={item} key={item.id} />
            ))}
          </section>
        );
      }}
    </FeedbackViewerData>
  );
}
