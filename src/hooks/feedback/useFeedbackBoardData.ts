import {
  getAdminReviewFeedbacks,
  getMyFeedbacks,
  getPendingFeedbackCount,
} from "@/lib/feedback/client";
import type { AdminReviewFeedback, OwnerFeedback } from "@/types/feedback";
import { useCallback, useEffect, useState } from "react";

type AuthenticatedFetcher<T> = (params: { accessToken: string; signal: AbortSignal }) => Promise<T>;

type UseFeedbackBoardResourceParams<T> = {
  enabled: boolean;
  fallbackValue: T;
  fetcher: AuthenticatedFetcher<T> | null;
  getAccessTokenOrThrow: () => Promise<string>;
};

type UseFeedbackBoardDataParams = {
  hasAdminRole: boolean;
  isRoleLoading: boolean;
  sessionAccessToken: string | null | undefined;
  getAccessTokenOrThrow: () => Promise<string>;
};

export type UseFeedbackBoardResult<T> = {
  data: T;
  isFail: boolean;
  isLoading: boolean;
  /** 이 리소스만 다시 불러온다. 다른 리소스는 건드리지 않는다. */
  refetch: () => void;
};

const EMPTY_OWNER_FEEDBACKS: OwnerFeedback[] = [];
const EMPTY_ADMIN_REVIEW_FEEDBACKS: AdminReviewFeedback[] = [];

function useFeedbackBoardResource<T>({
  enabled,
  fallbackValue,
  fetcher,
  getAccessTokenOrThrow,
}: UseFeedbackBoardResourceParams<T>): UseFeedbackBoardResult<T> {
  const [data, setData] = useState<T>(fallbackValue);
  const [isFail, setIsFail] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // 값 자체는 쓰이지 않는다. 아래 effect 를 다시 실행시키는 방아쇠 역할만 한다.
  const [reloadCount, setReloadCount] = useState(0);

  const refetch = useCallback(() => {
    setReloadCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled || fetcher == null) {
      setData(fallbackValue);
      setIsFail(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    void (async () => {
      try {
        setIsLoading(true);
        setIsFail(false);
        const accessToken = await getAccessTokenOrThrow();
        const nextData = await fetcher({
          accessToken,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        setData(nextData);
      } catch (error) {
        if (controller.signal.aborted) return;
        setIsFail(true);
        setData(fallbackValue);
        console.error(error);
      } finally {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [enabled, fallbackValue, fetcher, getAccessTokenOrThrow, reloadCount]);

  return { data, isFail, isLoading, refetch };
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
    fetcher: hasAdminRole ? null : getMyFeedbacks,
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
