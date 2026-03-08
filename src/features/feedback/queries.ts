import { queryOptions } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFreshAccessToken } from "@/lib/auth/client";
import type { AdminReviewFeedback, RevisedPendingOwnerFeedback } from "@/types/feedback";
import type { FeedbackMineResponse, FeedbackResponse, PendingCountResponse } from "@/types/response";

const MINE_STATUS_QUERY = new URLSearchParams({
  status: "pending,revised_pending",
}).toString();

const ADMIN_REVIEW_STATUS_QUERY = new URLSearchParams({
  status: "pending,revised_pending,rejected",
}).toString();

export const feedbackQueryKeys = {
  all: ["feedback"] as const,
  ownerPendingList: (viewerId: string) =>
    [...feedbackQueryKeys.all, "owner-pending-list", viewerId] as const,
  adminReviewList: (viewerId: string) =>
    [...feedbackQueryKeys.all, "admin-review-list", viewerId] as const,
  pendingCount: (viewerId: string) => [...feedbackQueryKeys.all, "pending-count", viewerId] as const,
};

type AuthorizedQueryParams = {
  supabaseClient: SupabaseClient | null;
  fallbackAccessToken: string;
  signal?: AbortSignal;
};

type ViewerAuthorizedQueryParams = AuthorizedQueryParams & {
  viewerId: string;
};

async function getAccessTokenOrThrow({
  supabaseClient,
  fallbackAccessToken,
}: Pick<AuthorizedQueryParams, "supabaseClient" | "fallbackAccessToken">) {
  const accessToken = await getFreshAccessToken({
    supabaseClient,
    fallbackAccessToken,
  });

  if (!accessToken) {
    throw new Error("Missing access token");
  }

  return accessToken;
}

async function requestAuthorizedGet({
  url,
  supabaseClient,
  fallbackAccessToken,
  signal,
}: AuthorizedQueryParams & {
  url: string;
}) {
  const accessToken = await getAccessTokenOrThrow({
    supabaseClient,
    fallbackAccessToken,
  });

  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });
}

export async function fetchOwnerPendingFeedbacks({
  supabaseClient,
  fallbackAccessToken,
  signal,
}: AuthorizedQueryParams): Promise<RevisedPendingOwnerFeedback[]> {
  const response = await requestAuthorizedGet({
    url: `/api/feedbacks/mine?${MINE_STATUS_QUERY}`,
    supabaseClient,
    fallbackAccessToken,
    signal,
  });

  const result: FeedbackMineResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error) {
    throw new Error(result.error ?? "Select failed Owner Pending Data");
  }

  return result.data ?? [];
}

export async function fetchAdminReviewFeedbacks({
  supabaseClient,
  fallbackAccessToken,
  signal,
}: AuthorizedQueryParams): Promise<AdminReviewFeedback[]> {
  const response = await requestAuthorizedGet({
    url: `/api/feedbacks?${ADMIN_REVIEW_STATUS_QUERY}`,
    supabaseClient,
    fallbackAccessToken,
    signal,
  });

  const result: FeedbackResponse<AdminReviewFeedback[]> = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error) {
    throw new Error(result.error ?? "Failed to fetch admin review feedbacks");
  }

  return result.data ?? [];
}

export async function fetchPendingCount({
  supabaseClient,
  fallbackAccessToken,
  signal,
}: AuthorizedQueryParams): Promise<number> {
  const response = await requestAuthorizedGet({
    url: "/api/feedbacks/pending-count",
    supabaseClient,
    fallbackAccessToken,
    signal,
  });

  const result: PendingCountResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error) {
    throw new Error(result.error ?? "Failed to fetch pending count");
  }

  if (typeof result.data?.count !== "number") {
    throw new Error("Invalid pending count response");
  }

  return result.data.count;
}

export function ownerPendingFeedbacksQueryOptions({
  viewerId,
  supabaseClient,
  fallbackAccessToken,
}: ViewerAuthorizedQueryParams) {
  return queryOptions({
    queryKey: feedbackQueryKeys.ownerPendingList(viewerId),
    queryFn: ({ signal }) =>
      fetchOwnerPendingFeedbacks({
        supabaseClient,
        fallbackAccessToken,
        signal,
      }),
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

export function adminReviewFeedbacksQueryOptions({
  viewerId,
  supabaseClient,
  fallbackAccessToken,
}: ViewerAuthorizedQueryParams) {
  return queryOptions({
    queryKey: feedbackQueryKeys.adminReviewList(viewerId),
    queryFn: ({ signal }) =>
      fetchAdminReviewFeedbacks({
        supabaseClient,
        fallbackAccessToken,
        signal,
      }),
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

export function pendingCountQueryOptions({
  viewerId,
  supabaseClient,
  fallbackAccessToken,
}: ViewerAuthorizedQueryParams) {
  return queryOptions({
    queryKey: feedbackQueryKeys.pendingCount(viewerId),
    queryFn: ({ signal }) =>
      fetchPendingCount({
        supabaseClient,
        fallbackAccessToken,
        signal,
      }),
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
