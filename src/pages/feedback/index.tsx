import { PageMeta } from "@/components/common";
import { FeedbackBox, FeedbackBoxSkeleton, NewFeedbackLinkBtn } from "@/components/feedback";
import { useSession } from "@/components/session";
import { Button, EmptyState, ErrorState, Select, Skeleton, useAlert } from "@/components/ui";
import {
  useFeedbackBoardData,
  type UseFeedbackBoardResult,
} from "@/hooks/feedback/useFeedbackBoardData";
import {
  compareUpdatedAtDesc,
  FeedbackListStatus,
  mergeFeedbackList,
  MergeFeedbackListParams,
  MergeFeedbackListResult,
} from "@/lib/feedback/list";
import { getApprovedFeedbacks, getRevisedPendingPreviewFeedbacks } from "@/lib/feedback/server";
import { cn } from "@/lib/shared/cn";
import {
  ApprovedFeedback,
  FeedbackListItem,
  RevisedPendingPreviewFeedback,
} from "@/types/feedback";
import { RefreshCw } from "lucide-react";
import { InferGetStaticPropsType } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

/**
 * 통계 카드의 숫자 자리.
 * 로딩과 실패와 0건이 같은 화면으로 보이지 않도록 네 경우를 나눠 그린다.
 */
function StatCardValue({
  resource,
  unit = "건",
}: {
  resource: UseFeedbackBoardResult<number | null>;
  unit?: string;
}) {
  if (resource.isLoading) {
    return <Skeleton className="mt-2 h-8 w-16" />;
  }

  if (resource.isFail) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-destructive">불러오지 못했습니다</p>
        <Button type="button" variant="outline" size="xs" onClick={resource.refetch}>
          <RefreshCw aria-hidden />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <strong className="mt-2 block text-2xl font-semibold text-foreground">
      {resource.data === null ? "-" : `${resource.data}${unit}`}
    </strong>
  );
}

/** 보여줄 피드백이 하나도 없을 때. 누가 보고 있느냐에 따라 안내가 달라진다. */
function BoardEmptyState({
  hasAdminRole,
  isSignedIn,
}: {
  hasAdminRole: boolean;
  isSignedIn: boolean;
}) {
  if (hasAdminRole) {
    return (
      <EmptyState
        variant="inline"
        title="검토할 피드백이 없습니다."
        description="새 피드백이 등록되면 이곳에 표시됩니다."
      />
    );
  }

  return (
    <EmptyState
      title={isSignedIn ? "아직 피드백이 없습니다." : "아직 공개된 피드백이 없습니다."}
      description={
        isSignedIn
          ? "첫 피드백을 남겨보세요. 관리자 승인 후 공개됩니다."
          : "피드백이 승인되면 이곳에 공개됩니다."
      }
      action={<NewFeedbackLinkBtn />}
    />
  );
}

export default function FeedbackBoardPage({
  approvedFeedbacks,
  revisedPendingPreviews,
  alertMessage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const isAlertedRef = useRef(false);

  const { openAlert } = useAlert();
  const { session, hasAdminRole, isRoleLoading, getAccessTokenOrThrow } = useSession();
  const [sortType, setSortType] = useState<"updated_desc" | "updated_asc">("updated_desc");
  const { pendingCount, ownerFeedbacks, adminReviewFeedbacks } = useFeedbackBoardData({
    hasAdminRole,
    isRoleLoading,
    sessionAccessToken: session?.access_token,
    getAccessTokenOrThrow,
  });
  const { mergedFeedbacks, mergedFeedbackStatus } = useMemo<MergeFeedbackListResult>(
    () =>
      mergeFeedbackList({
        approved: approvedFeedbacks,
        revisedPreview: revisedPendingPreviews,
        mine: ownerFeedbacks,
        adminReview: adminReviewFeedbacks,
        hasAdminRole,
      } satisfies MergeFeedbackListParams),
    [approvedFeedbacks, revisedPendingPreviews, ownerFeedbacks, adminReviewFeedbacks, hasAdminRole]
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

  const isSignedIn = Boolean(session?.access_token);
  // 로딩/실패 카드가 떠 있는 동안에는 "없다"고 단정할 수 없다.
  const isBoardEmpty = visibleFeedbacks.length === 0 && mergedFeedbackStatus.length === 0;
  const boardStatusText = hasAdminRole
    ? {
        loading: "검토 대기 피드백을 불러오는 중입니다.",
        fail: "검토 대기 피드백을 불러오지 못했습니다.",
      }
    : {
        loading: "내 피드백을 불러오는 중입니다.",
        fail: "내 피드백을 불러오지 못했습니다.",
      };
  // 목록 자리의 상태 카드는 역할에 따라 둘 중 하나만 뜬다. 재시도도 그 하나만 겨냥한다.
  const retryBoardList = hasAdminRole ? adminReviewFeedbacks.refetch : ownerFeedbacks.refetch;

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
              {!isRoleLoading && hasAdminRole && (
                <Button asChild>
                  <Link href="/admin/feedback">관리자 보기</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section
          className={cn("grid gap-4", {
            "md:grid-cols-3": hasAdminRole,
            "md:grid-cols-2": !hasAdminRole,
          })}
        >
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              전체
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {`${mergedFeedbacks.length}건`}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              승인됨
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {`${approvedFeedbacks.length}건`}
            </strong>
          </div>
          {hasAdminRole && (
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                승인 대기
              </p>
              <StatCardValue resource={pendingCount} />
            </div>
          )}
        </section>

        <section className="grid gap-4">
          {mergedFeedbackStatus.map((item: FeedbackListStatus) => {
            if (item.isLoading) {
              return <FeedbackBoxSkeleton key={item.id} label={boardStatusText.loading} />;
            }

            if (item.isFail) {
              return (
                <ErrorState
                  key={item.id}
                  title={boardStatusText.fail}
                  description="공개된 피드백은 그대로 표시됩니다."
                  onRetry={retryBoardList}
                />
              );
            }

            return null;
          })}

          {isBoardEmpty ? (
            <BoardEmptyState hasAdminRole={hasAdminRole} isSignedIn={isSignedIn} />
          ) : (
            visibleFeedbacks.map((item: FeedbackListItem) => {
              return <FeedbackBox data={item} key={item.id} />;
            })
          )}
        </section>
      </div>
    </>
  );
}
