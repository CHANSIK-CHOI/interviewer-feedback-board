import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Select, useAlert } from "@/components/ui";
import { getApprovedFeedbacks, getRevisedPendingPreviewFeedbacks } from "@/lib/feedback/server";
import { cn } from "@/lib/shared/cn";
import { InferGetStaticPropsType } from "next";
import { useSession } from "@/components/session";
import {
  compareUpdatedAtDesc,
  mergeFeedbackList,
  MergeFeedbackListParams,
} from "@/lib/feedback/list";
import { FeedbackBox, NewFeedbackLinkBtn } from "@/components/feedback";
import { getFreshAccessToken } from "@/lib/auth/client";
import {
  AdminReviewFeedback,
  ApprovedFeedback,
  FeedbackListItem,
  RevisedPendingOwnerFeedback,
  RevisedPendingPreviewFeedback,
} from "@/types/feedback";
import { FeedbackMineResponse, FeedbackResponse, PendingCountResponse } from "@/types/response";

const MINE_STATUS_QUERY = new URLSearchParams({
  status: "pending,revised_pending",
}).toString();

const ADMIN_REVIEW_STATUS_QUERY = new URLSearchParams({
  status: "pending,revised_pending,rejected",
}).toString();

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
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [sortType, setSortType] = useState<"updated_desc" | "updated_asc">("updated_desc");
  const [ownerPendingFeedbacks, setOwnerPendingFeedbacks] = useState<RevisedPendingOwnerFeedback[]>(
    []
  );
  const [adminReviewFeedbacks, setAdminReviewFeedbacks] = useState<AdminReviewFeedback[]>([]);
  const feedbackData = useMemo<FeedbackListItem[]>(
    () =>
      mergeFeedbackList({
        approved: approvedFeedbacks,
        revisedPreview: revisedPendingPreviews,
        revisedMine: ownerPendingFeedbacks,
        adminReview: adminReviewFeedbacks,
      } satisfies MergeFeedbackListParams),
    [approvedFeedbacks, revisedPendingPreviews, ownerPendingFeedbacks, adminReviewFeedbacks]
  );
  const sortedFeedbackData = useMemo(() => {
    return [...feedbackData].sort((a, b) =>
      sortType === "updated_desc" ? compareUpdatedAtDesc(a, b) : compareUpdatedAtDesc(b, a)
    );
  }, [feedbackData, sortType]);

  useEffect(() => {
    if (alertMessage && !isAlertedRef.current) {
      openAlert({
        description: alertMessage,
      });
      isAlertedRef.current = true;
    }
  }, [alertMessage, openAlert]);

  // admin 사용자 : 승인 대기 중 count 가져오기
  useEffect(() => {
    if (isRoleLoading || !isAdminUi || !session?.access_token) {
      setPendingCount(null);
      return;
    }

    const controller = new AbortController();
    const loadPendingCount = async () => {
      try {
        const accessToken = await getFreshAccessToken({
          supabaseClient,
          fallbackAccessToken: session.access_token,
        });

        const response = await fetch("/api/feedbacks/pending-count", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
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

        if (controller.signal.aborted) return;
        setPendingCount(result.data.count);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setPendingCount(null);
      }
    };
    loadPendingCount();

    return () => controller.abort();
  }, [isRoleLoading, isAdminUi, session?.access_token, supabaseClient]);

  // 로그인 시 본인이 작성한 게시물 중 pending, revised_pending의 데이터를 가져와 list에 merge 하기
  useEffect(() => {
    if (!session?.access_token) {
      setOwnerPendingFeedbacks([]);
      return;
    }
    const controller = new AbortController();
    const getPendingOwnerFeedback = async () => {
      try {
        const accessToken = await getFreshAccessToken({
          supabaseClient,
          fallbackAccessToken: session.access_token,
        });

        const response = await fetch(`/api/feedbacks/mine?${MINE_STATUS_QUERY}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        const result: FeedbackMineResponse = await response
          .json()
          .catch(() => ({ data: null, error: "Invalid response" }));

        if (!response.ok || result.error) {
          throw new Error(result.error ?? "Select failed Owner Pending Data");
        }

        if (controller.signal.aborted) return;
        setOwnerPendingFeedbacks(result.data ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setOwnerPendingFeedbacks([]);
      }
    };
    getPendingOwnerFeedback();

    return () => controller.abort();
  }, [session?.access_token, supabaseClient]);

  // 로그인 시 admin role 유저일 때 게시물 중 pending, revised_pending, rejected의 데이터를 가져와 list에 merge 하기
  useEffect(() => {
    if (isRoleLoading || !isAdminUi || !session?.access_token) {
      setAdminReviewFeedbacks([]);
      return;
    }

    const controller = new AbortController();
    const getAdminReviewFeedbacks = async () => {
      try {
        const accessToken = await getFreshAccessToken({
          supabaseClient,
          fallbackAccessToken: session.access_token,
        });

        const response = await fetch(`/api/feedbacks?${ADMIN_REVIEW_STATUS_QUERY}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        const result: FeedbackResponse<AdminReviewFeedback[]> = await response
          .json()
          .catch(() => ({ data: null, error: "Invalid response" }));

        if (!response.ok || result.error) {
          throw new Error(result.error ?? "Failed to fetch admin review feedbacks");
        }
        if (controller.signal.aborted) return;
        setAdminReviewFeedbacks(result.data ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setAdminReviewFeedbacks([]);
      }
    };

    getAdminReviewFeedbacks();
    return () => controller.abort();
  }, [isRoleLoading, isAdminUi, session?.access_token, supabaseClient]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">인터뷰어 피드백 보드</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              승인된 피드백은 공개 보드에 노출되고, 승인 대기 중인 피드백은 상태 배지가 표시됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={sortType}
              onValueChange={(value: "updated_desc" | "updated_asc") => setSortType(value)}
            >
              <Select.Trigger className="w-[170px] bg-background">
                <Select.Value placeholder="정렬 선택" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="updated_desc">최신 수정순</Select.Item>
                <Select.Item value="updated_asc">오래된 수정순</Select.Item>
              </Select.Content>
            </Select>
            <NewFeedbackLinkBtn />
            {!isRoleLoading && isAdminUi && (
              <Button asChild>
                <Link href="/admin/feedback">관리자 보기</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section
        className={cn("grid gap-4", {
          "md:grid-cols-3": isAdminUi,
          "md:grid-cols-2": !isAdminUi,
        })}
      >
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            전체
          </p>
          <strong className="mt-2 block text-2xl font-semibold text-foreground">
            {feedbackData.length}
          </strong>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            승인됨
          </p>
          <strong className="mt-2 block text-2xl font-semibold text-foreground">
            {approvedFeedbacks.length}
          </strong>
        </div>
        {isAdminUi && (
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              승인 대기
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {pendingCount ?? "-"}
            </strong>
          </div>
        )}
      </section>

      <section className="grid gap-4">
        {sortedFeedbackData.map((item) => {
          return <FeedbackBox data={item} key={item.id} />;
        })}
      </section>
    </div>
  );
}
