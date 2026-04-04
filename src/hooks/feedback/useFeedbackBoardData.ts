import { useEffect, useState } from "react";
import {
  getAdminReviewFeedbacks,
  getMyFeedbacks,
  getPendingFeedbackCount,
} from "@/lib/feedback/client";
import type { AdminReviewFeedback, OwnerFeedback } from "@/types/feedback";

type AuthenticatedFetcher<T> = (params: {
  accessToken: string;
  signal: AbortSignal;
}) => Promise<T>;

type UseFeedbackBoardResourceParams<T> = {
  enabled: boolean;
  fallbackValue: T;
  fetcher: AuthenticatedFetcher<T>;
  getAccessTokenOrThrow: () => Promise<string>;
};

type UseFeedbackBoardDataParams = {
  hasAdminRole: boolean;
  isRoleLoading: boolean;
  sessionAccessToken: string | null | undefined;
  getAccessTokenOrThrow: () => Promise<string>;
};

const EMPTY_OWNER_FEEDBACKS: OwnerFeedback[] = [];
const EMPTY_ADMIN_REVIEW_FEEDBACKS: AdminReviewFeedback[] = [];

function useFeedbackBoardResource<T>({
  enabled,
  fallbackValue,
  fetcher,
  getAccessTokenOrThrow,
}: UseFeedbackBoardResourceParams<T>) {
  const [data, setData] = useState<T>(fallbackValue);

  useEffect(() => {
    if (!enabled) {
      setData(fallbackValue);
      return;
    }

    const controller = new AbortController();

    void (async () => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        const nextData = await fetcher({
          accessToken,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        setData(nextData);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setData(fallbackValue);
      }
    })();

    return () => controller.abort();
  }, [enabled, fallbackValue, fetcher, getAccessTokenOrThrow]);

  return data;
}

export function useFeedbackBoardData({
  hasAdminRole,
  isRoleLoading,
  sessionAccessToken,
  getAccessTokenOrThrow,
}: UseFeedbackBoardDataParams) {
  const isSignedIn = Boolean(sessionAccessToken);
  const isAdminQueryEnabled = !isRoleLoading && hasAdminRole && isSignedIn;

  const pendingCount = useFeedbackBoardResource<number | null>({
    enabled: isAdminQueryEnabled,
    fallbackValue: null,
    fetcher: getPendingFeedbackCount,
    getAccessTokenOrThrow,
  });

  const ownerFeedbacks = useFeedbackBoardResource<OwnerFeedback[]>({
    enabled: isSignedIn,
    fallbackValue: EMPTY_OWNER_FEEDBACKS,
    fetcher: getMyFeedbacks,
    getAccessTokenOrThrow,
  });

  const adminReviewFeedbacks = useFeedbackBoardResource<AdminReviewFeedback[]>({
    enabled: isAdminQueryEnabled,
    fallbackValue: EMPTY_ADMIN_REVIEW_FEEDBACKS,
    fetcher: getAdminReviewFeedbacks,
    getAccessTokenOrThrow,
  });

  return {
    pendingCount,
    ownerFeedbacks,
    adminReviewFeedbacks,
  };
}
