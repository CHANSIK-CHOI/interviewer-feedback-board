import React, { useEffect, useRef, useState } from "react";
import { useAlert } from "@/components/ui";
import { getApprovedFeedbacks, getRevisedPendingPreviewFeedbacks } from "@/lib/feedback/server";
import { InferGetStaticPropsType } from "next";
import { useSession } from "@/components/session";
import type { ApprovedFeedback, RevisedPendingPreviewFeedback } from "@/types/feedback";
import {
  FeedbackBoardHeaderSection,
  FeedbackListSection,
  FeedbackListSectionSkeleton,
  FeedbackSectionBoundary,
  FeedbackSectionErrorState,
  FeedbackSummarySection,
  FeedbackSummarySectionSkeleton,
} from "@/features/feedback/sections";
import type { FeedbackSortType } from "@/features/feedback/types";

export const getStaticProps = async () => {
  try {
    const approvedFeedbacks: ApprovedFeedback[] = await getApprovedFeedbacks();
    const revisedPendingPreviews: RevisedPendingPreviewFeedback[] =
      await getRevisedPendingPreviewFeedbacks();

    return {
      props: {
        approvedFeedbacks,
        revisedPendingPreviews,
        alertMessage: null,
      },
    };
  } catch (error) {
    console.error(error);

    return {
      props: {
        approvedFeedbacks: [],
        revisedPendingPreviews: [],
        alertMessage: "데이터를 정상적으로 불러올 수 없습니다.",
      },
    };
  }
};

export default function FeedbackBoardPage({
  approvedFeedbacks,
  revisedPendingPreviews,
  alertMessage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const isAlertedRef = useRef(false);
  const { openAlert } = useAlert();
  const { session, supabaseClient, isAdminUi, isRoleLoading } = useSession();
  const [sortType, setSortType] = useState<FeedbackSortType>("updated_desc");
  const viewerId = session?.user?.id ?? null;
  const sessionAccessToken = session?.access_token ?? null;

  useEffect(() => {
    if (alertMessage && !isAlertedRef.current) {
      openAlert({
        description: alertMessage,
      });
      isAlertedRef.current = true;
    }
  }, [alertMessage, openAlert]);

  return (
    <div className="flex flex-col gap-6">
      <FeedbackBoardHeaderSection
        isAdminUi={isAdminUi}
        isRoleLoading={isRoleLoading}
        onSortTypeChange={setSortType}
        sortType={sortType}
      />

      <FeedbackSectionBoundary
        fallback={<FeedbackSummarySectionSkeleton isAdminUi={isAdminUi} />}
        errorFallback={({ reset }) => (
          <FeedbackSectionErrorState
            className="grid gap-4"
            description="잠시 후 다시 시도해 주세요."
            onRetry={reset}
            title="보드 요약 정보를 불러오지 못했습니다."
          />
        )}
      >
        <FeedbackSummarySection
          approvedFeedbacks={approvedFeedbacks}
          isAdminUi={isAdminUi}
          isRoleLoading={isRoleLoading}
          revisedPendingPreviews={revisedPendingPreviews}
          sessionAccessToken={sessionAccessToken}
          supabaseClient={supabaseClient}
          viewerId={viewerId}
        />
      </FeedbackSectionBoundary>

      <FeedbackSectionBoundary
        fallback={<FeedbackListSectionSkeleton />}
        errorFallback={({ reset }) => (
          <FeedbackSectionErrorState
            className="grid gap-4"
            description="잠시 후 다시 시도해 주세요."
            onRetry={reset}
            title="피드백 목록을 불러오지 못했습니다."
          />
        )}
      >
        <FeedbackListSection
          approvedFeedbacks={approvedFeedbacks}
          isAdminUi={isAdminUi}
          isRoleLoading={isRoleLoading}
          revisedPendingPreviews={revisedPendingPreviews}
          sessionAccessToken={sessionAccessToken}
          sortType={sortType}
          supabaseClient={supabaseClient}
          viewerId={viewerId}
        />
      </FeedbackSectionBoundary>
    </div>
  );
}
