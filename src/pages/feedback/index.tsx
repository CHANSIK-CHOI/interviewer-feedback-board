import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Select, useAlert } from "@/components/ui";
import { PageMeta } from "@/components/common";
import {
  getAdminReviewFeedbacks,
  getMyFeedbacks,
  getPendingFeedbackCount,
} from "@/lib/feedback/client";
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
import {
  AdminReviewFeedback,
  ApprovedFeedback,
  FeedbackListItem,
  OwnerFeedback,
  RevisedPendingPreviewFeedback,
} from "@/types/feedback";

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
  const { session, isAdminUi, isRoleLoading, getAccessTokenOrThrow } = useSession();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [sortType, setSortType] = useState<"updated_desc" | "updated_asc">("updated_desc");
  const [ownerFeedbacks, setOwnerFeedbacks] = useState<OwnerFeedback[]>([]);
  const [adminReviewFeedbacks, setAdminReviewFeedbacks] = useState<AdminReviewFeedback[]>([]);
  const mergedFeedbacks = useMemo<FeedbackListItem[]>(
    () =>
      mergeFeedbackList({
        approved: approvedFeedbacks,
        revisedPreview: revisedPendingPreviews,
        mine: ownerFeedbacks,
        adminReview: adminReviewFeedbacks,
      } satisfies MergeFeedbackListParams),
    [approvedFeedbacks, revisedPendingPreviews, ownerFeedbacks, adminReviewFeedbacks]
  );
  const visibleFeedbacks = useMemo(() => {
    return [...mergedFeedbacks].sort((a, b) =>
      sortType === "updated_desc" ? compareUpdatedAtDesc(a, b) : compareUpdatedAtDesc(b, a)
    );
  }, [mergedFeedbacks, sortType]);

  useEffect(() => {
    if (alertMessage && !isAlertedRef.current) {
      openAlert({
        description: alertMessage,
      });
      isAlertedRef.current = true;
    }
  }, [alertMessage, openAlert]);

  useEffect(() => {
    if (isRoleLoading || !isAdminUi || !session?.access_token) {
      setPendingCount(null);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        const count = await getPendingFeedbackCount({
          accessToken,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setPendingCount(count);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setPendingCount(null);
      }
    })();

    return () => controller.abort();
  }, [isRoleLoading, isAdminUi, session?.access_token, getAccessTokenOrThrow]);

  useEffect(() => {
    if (!session?.access_token) {
      setOwnerFeedbacks([]);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        const feedbacks = await getMyFeedbacks({
          accessToken,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setOwnerFeedbacks(feedbacks);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setOwnerFeedbacks([]);
      }
    })();

    return () => controller.abort();
  }, [session?.access_token, getAccessTokenOrThrow]);

  useEffect(() => {
    if (isRoleLoading || !isAdminUi || !session?.access_token) {
      setAdminReviewFeedbacks([]);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        const feedbacks = await getAdminReviewFeedbacks({
          accessToken,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setAdminReviewFeedbacks(feedbacks);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setAdminReviewFeedbacks([]);
      }
    })();
    return () => controller.abort();
  }, [isRoleLoading, isAdminUi, session?.access_token, getAccessTokenOrThrow]);

  return (
    <>
      <PageMeta
        title="피드백 보드"
        ogTitle="인터뷰어 피드백 보드"
        description="승인된 피드백과 검토 상태를 확인할 수 있는 공개 피드백 보드입니다."
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">인터뷰어 피드백 보드</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                승인된 피드백은 공개 보드에 노출되고, 승인 대기 중인 피드백은 상태 배지가
                표시됩니다.
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
              {mergedFeedbacks.length}
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
          {visibleFeedbacks.map((item) => {
            return <FeedbackBox data={item} key={item.id} />;
          })}
        </section>
      </div>
    </>
  );
}
