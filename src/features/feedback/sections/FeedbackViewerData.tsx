import React, { ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminReviewFeedback, RevisedPendingOwnerFeedback } from "@/types/feedback";
import {
  adminReviewFeedbacksQueryOptions,
  ownerPendingFeedbacksQueryOptions,
} from "@/features/feedback/queries";

type FeedbackViewerDataRenderProps = {
  ownerPendingFeedbacks: RevisedPendingOwnerFeedback[];
  adminReviewFeedbacks: AdminReviewFeedback[];
};

type FeedbackViewerDataProps = {
  children: (props: FeedbackViewerDataRenderProps) => ReactNode;
  isAdminUi: boolean;
  isRoleLoading: boolean;
  sessionAccessToken: string | null;
  viewerId: string | null;
  supabaseClient: SupabaseClient | null;
};

export default function FeedbackViewerData({
  children,
  isAdminUi,
  isRoleLoading,
  sessionAccessToken,
  viewerId,
  supabaseClient,
}: FeedbackViewerDataProps) {
  if (!sessionAccessToken || !viewerId) {
    return children({
      ownerPendingFeedbacks: [],
      adminReviewFeedbacks: [],
    });
  }

  return (
    <FeedbackViewerDataWithOwner
      isAdminUi={isAdminUi}
      isRoleLoading={isRoleLoading}
      sessionAccessToken={sessionAccessToken}
      supabaseClient={supabaseClient}
      viewerId={viewerId}
    >
      {children}
    </FeedbackViewerDataWithOwner>
  );
}

function FeedbackViewerDataWithOwner({
  children,
  isAdminUi,
  isRoleLoading,
  sessionAccessToken,
  viewerId,
  supabaseClient,
}: Omit<FeedbackViewerDataProps, "sessionAccessToken" | "viewerId"> & {
  sessionAccessToken: string;
  viewerId: string;
}) {
  const { data: ownerPendingFeedbacks } = useSuspenseQuery(
    ownerPendingFeedbacksQueryOptions({
      viewerId,
      supabaseClient,
      fallbackAccessToken: sessionAccessToken,
    })
  );

  if (isRoleLoading || !isAdminUi) {
    return children({
      ownerPendingFeedbacks,
      adminReviewFeedbacks: [],
    });
  }

  return (
    <FeedbackViewerDataWithAdmin
      ownerPendingFeedbacks={ownerPendingFeedbacks}
      sessionAccessToken={sessionAccessToken}
      supabaseClient={supabaseClient}
      viewerId={viewerId}
    >
      {children}
    </FeedbackViewerDataWithAdmin>
  );
}

function FeedbackViewerDataWithAdmin({
  children,
  ownerPendingFeedbacks,
  sessionAccessToken,
  viewerId,
  supabaseClient,
}: Pick<FeedbackViewerDataProps, "children" | "supabaseClient"> & {
  ownerPendingFeedbacks: RevisedPendingOwnerFeedback[];
  sessionAccessToken: string;
  viewerId: string;
}) {
  const { data: adminReviewFeedbacks } = useSuspenseQuery(
    adminReviewFeedbacksQueryOptions({
      viewerId,
      supabaseClient,
      fallbackAccessToken: sessionAccessToken,
    })
  );

  return children({
    ownerPendingFeedbacks,
    adminReviewFeedbacks,
  });
}
