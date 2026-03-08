import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeFeedbackList } from "@/lib/feedback/list";
import { cn } from "@/lib/shared/cn";
import type { ApprovedFeedback, RevisedPendingPreviewFeedback } from "@/types/feedback";
import FeedbackAdminPendingCountCard from "./FeedbackAdminPendingCountCard";
import FeedbackSectionBoundary from "./FeedbackSectionBoundary";
import {
  FeedbackAdminPendingCountCardErrorState,
  FeedbackAdminPendingCountCardSkeleton,
} from "./FeedbackSectionFallbacks";
import FeedbackStatCard from "./FeedbackStatCard";
import FeedbackViewerData from "./FeedbackViewerData";

type FeedbackSummarySectionProps = {
  approvedFeedbacks: ApprovedFeedback[];
  revisedPendingPreviews: RevisedPendingPreviewFeedback[];
  isAdminUi: boolean;
  isRoleLoading: boolean;
  sessionAccessToken: string | null;
  viewerId: string | null;
  supabaseClient: SupabaseClient | null;
};

export default function FeedbackSummarySection({
  approvedFeedbacks,
  revisedPendingPreviews,
  isAdminUi,
  isRoleLoading,
  sessionAccessToken,
  viewerId,
  supabaseClient,
}: FeedbackSummarySectionProps) {
  return (
    <FeedbackViewerData
      isAdminUi={isAdminUi}
      isRoleLoading={isRoleLoading}
      sessionAccessToken={sessionAccessToken}
      supabaseClient={supabaseClient}
      viewerId={viewerId}
    >
      {({ ownerPendingFeedbacks, adminReviewFeedbacks }) => {
        const totalCount = mergeFeedbackList({
          approved: approvedFeedbacks,
          revisedPreview: revisedPendingPreviews,
          revisedMine: ownerPendingFeedbacks,
          adminReview: adminReviewFeedbacks,
        }).length;

        return (
          <section
            className={cn("grid gap-4", {
              "md:grid-cols-3": isAdminUi,
              "md:grid-cols-2": !isAdminUi,
            })}
          >
            <FeedbackStatCard label="전체" value={totalCount} />
            <FeedbackStatCard label="승인됨" value={approvedFeedbacks.length} />
            {isAdminUi &&
              (isRoleLoading || !sessionAccessToken || !viewerId ? (
                <FeedbackStatCard label="승인 대기" value="-" />
              ) : (
                <FeedbackSectionBoundary
                  fallback={<FeedbackAdminPendingCountCardSkeleton />}
                  errorFallback={({ reset }) => (
                    <FeedbackAdminPendingCountCardErrorState onRetry={reset} />
                  )}
                >
                  <FeedbackAdminPendingCountCard
                    fallbackAccessToken={sessionAccessToken}
                    supabaseClient={supabaseClient}
                    viewerId={viewerId}
                  />
                </FeedbackSectionBoundary>
              ))}
          </section>
        );
      }}
    </FeedbackViewerData>
  );
}
