import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Select } from "@/components/ui";
import { compareUpdatedAtDesc } from "@/lib/feedback/list";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { AuthContextResult, resolveAuthContextByAccessToken } from "@/lib/auth/server";
import { FeedbackRowsByStatusesParams, getFeedbackRowsByStatuses } from "@/lib/feedback/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { DeleteFeedbackResult } from "@/lib/feedback/client";
import AdminFeedbackBox from "@/components/admin/AdminFeedbackBox";
import { PageMeta } from "@/components/common";
import { FeedbackPublicWithEmailRow, ReviewFeedbackResult } from "@/types/feedback";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const accessToken = context.req.cookies["sb-access-token"];
  if (!accessToken) {
    return { notFound: true };
  }

  const authResult: AuthContextResult = await resolveAuthContextByAccessToken(accessToken);
  const { context: authContext, error: authError } = authResult;
  if (authError || !authContext || !authContext.isAdmin) {
    return { notFound: true };
  }

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return { notFound: true };
  }

  try {
    const feedbacks: FeedbackPublicWithEmailRow[] = await getFeedbackRowsByStatuses({
      supabaseClient: supabaseServerAdminClient,
      statuses: ["pending", "approved", "rejected", "revised_pending"],
    } satisfies FeedbackRowsByStatusesParams);

    return {
      props: { feedbackData: feedbacks },
    };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
};

export default function AdminFeedbackPage({
  feedbackData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackPublicWithEmailRow[]>(feedbackData);
  const [viewType, setViewType] = useState<"all" | "pending">("all");
  const [sortType, setSortType] = useState<"updated_desc" | "updated_asc">("updated_desc");

  const handleReviewed = (result: ReviewFeedbackResult) => {
    setFeedbackItems((prev) =>
      prev.map((item) =>
        item.id === result.id
          ? {
              ...item,
              status: result.status,
              is_public: result.is_public,
              reviewed_at: result.reviewed_at,
              reviewed_by: result.reviewed_by,
            }
          : item
      )
    );
  };

  const handleDeleted = (result: DeleteFeedbackResult) => {
    setFeedbackItems((prev) => prev.filter((item) => item.id !== result.id));
  };

  const visibleFeedbacks = useMemo(() => {
    const filteredFeedbacks =
      viewType === "pending"
        ? feedbackItems.filter(
            (item) => item.status === "pending" || item.status === "revised_pending"
          )
        : feedbackItems;

    return [...filteredFeedbacks].sort((a, b) =>
      sortType === "updated_desc" ? compareUpdatedAtDesc(a, b) : compareUpdatedAtDesc(b, a)
    );
  }, [feedbackItems, sortType, viewType]);

  const pendingCount = feedbackItems.filter((item) => item.status === "pending").length;
  const revisedPendingCount = feedbackItems.filter(
    (item) => item.status === "revised_pending"
  ).length;
  const rejectedCount = feedbackItems.filter((item) => item.status === "rejected").length;

  return (
    <>
      <PageMeta
        title="관리자 피드백 검토"
        ogTitle="관리자 피드백 검토"
        description="관리자 전용 피드백 검토 페이지입니다."
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                관리자
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">피드백 검토 큐</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                관리자 전용 목록입니다. 이메일 포함 전체 데이터를 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button asChild variant="outline">
                <Link href="/feedback">공개 목록으로 이동하기</Link>
              </Button>
              <Select
                value={viewType}
                onValueChange={(value: "all" | "pending") => setViewType(value)}
              >
                <Select.Trigger className="w-[140px] bg-background">
                  <Select.Value placeholder="보기 선택" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">전체 보기</Select.Item>
                  <Select.Item value="pending">승인 대기만</Select.Item>
                </Select.Content>
              </Select>
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
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              전체
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {feedbackItems.length}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              승인 대기
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {pendingCount}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              수정 승인 대기
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {revisedPendingCount}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              반려
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {rejectedCount}
            </strong>
          </div>
        </section>

        <section className="grid gap-4">
          {visibleFeedbacks.length === 0 && (
            <div className="rounded-2xl border border-border/60 bg-background/80 p-6 text-sm text-muted-foreground dark:border-white/10 dark:bg-neutral-900/70">
              검토할 피드백이 없습니다.
            </div>
          )}

          {visibleFeedbacks.map((item) => (
            <AdminFeedbackBox
              data={item}
              key={item.id}
              onReviewed={handleReviewed}
              onDeleted={handleDeleted}
            />
          ))}
        </section>
      </div>
    </>
  );
}
