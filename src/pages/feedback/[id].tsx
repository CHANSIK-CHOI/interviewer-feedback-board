import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { formatDateTime, ratingStars, statusBadge, statusLabel } from "@/lib/feedback/presentation";
import { checkAvatarApiSrcPrivate, checkSvgImageSrc } from "@/lib/avatar/path";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getFeedbackDetailById, getFeedbackEmailById } from "@/lib/feedback/server";
import { AuthContextResult, getAuthContextByAccessToken } from "@/lib/auth/server";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { checkUpdateData } from "@/lib/feedback/list";
import { getAuthUserNameById } from "@/lib/user/profile.server";
import { FeedbackPublicAndEmailRow, FeedbackPublicRow } from "@/types/feedback";
import { DeleteFeedbackButton, PageMeta, ReviewControls } from "@/components/common";
import { ReviewFeedbackResultWithReviewerName } from "@/lib/feedback/client";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const id = context.params?.id;
  if (typeof id !== "string") {
    return { notFound: true };
  }

  try {
    const detailFeedback: FeedbackPublicRow = await getFeedbackDetailById(id);
    const reviewerName: string | null = detailFeedback.reviewed_by
      ? await getAuthUserNameById(detailFeedback.reviewed_by).catch(() => null)
      : null;

    const accessToken = context.req.cookies["sb-access-token"];
    let isAuthor = false;
    let isAdmin = false;
    let mergedDetailFeedback: FeedbackPublicAndEmailRow = detailFeedback;

    if (!accessToken) {
      if (detailFeedback.status !== "approved") return { notFound: true };
    } else {
      const authResult: AuthContextResult = await getAuthContextByAccessToken(accessToken);
      const { context: authContext, error: authError } = authResult;

      if (authError || !authContext) throw new Error("Auth Context Error");

      isAdmin = authContext.isAdmin;
      isAuthor = authContext.userId === detailFeedback.author_id;

      // approved가 아니면 작성자/관리자만 접근 허용
      if (detailFeedback.status !== "approved" && !isAuthor && !isAdmin) return { notFound: true };

      if (isAuthor || isAdmin) {
        const email: string | null = await getFeedbackEmailById(id).catch(() => null);
        if (email) {
          mergedDetailFeedback = {
            ...detailFeedback,
            email,
          };
        }
      }
    }

    return {
      props: { detailFeedback: mergedDetailFeedback, reviewerName, isAuthor, isAdmin },
    };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
};

export default function FeedbackDetailPage({
  detailFeedback,
  reviewerName,
  isAuthor,
  isAdmin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [currentDetailFeedback, setCurrentDetailFeedback] =
    useState<FeedbackPublicAndEmailRow>(detailFeedback);
  const [currentReviewerName, setCurrentReviewerName] = useState<string | null>(reviewerName);

  const handleReviewed = (result: ReviewFeedbackResultWithReviewerName) => {
    setCurrentDetailFeedback((prev) => ({
      ...prev,
      status: result.status,
      is_public: result.is_public,
      reviewed_at: result.reviewed_at,
      reviewed_by: result.reviewed_by,
    }));
    setCurrentReviewerName(result.reviewer_name);
  };

  const avatarSrc = currentDetailFeedback.avatar_url || AVATAR_PLACEHOLDER_SRC;
  const isUpdateData = checkUpdateData(currentDetailFeedback);

  return (
    <>
      <PageMeta
        title={currentDetailFeedback.summary}
        ogTitle={currentDetailFeedback.summary}
        description="인터뷰어 피드백 상세와 검토 상태를 확인할 수 있는 페이지입니다."
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                피드백 상세
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                {currentDetailFeedback.summary}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {isAuthor && (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    작성자
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/feedback">목록으로 이동하기</Link>
              </Button>
              {isAuthor && (
                <Button asChild>
                  <Link href={`/feedback/edit/${currentDetailFeedback.id}`}>수정하기</Link>
                </Button>
              )}
              {(isAdmin || isAuthor) && (
                <DeleteFeedbackButton id={currentDetailFeedback.id} redirectTo="/feedback" />
              )}
              {isAdmin && (
                <ReviewControls
                  id={currentDetailFeedback.id}
                  status={currentDetailFeedback.status}
                  onSuccess={handleReviewed}
                />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(currentDetailFeedback.status)}`}
            >
              {statusLabel(currentDetailFeedback.status)}
            </span>
            <span className="text-sm font-semibold text-amber-500">
              {ratingStars(currentDetailFeedback.rating)}
            </span>
            <span className="text-xs text-muted-foreground">
              수정 {currentDetailFeedback.revision_count}회
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                <Image
                  src={avatarSrc}
                  alt={`${currentDetailFeedback.display_name} avatar`}
                  width={48}
                  height={48}
                  unoptimized={checkSvgImageSrc(avatarSrc) || checkAvatarApiSrcPrivate(avatarSrc)}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-base font-semibold text-foreground">
                {currentDetailFeedback.display_name}
              </span>
              {currentDetailFeedback.is_company_public && currentDetailFeedback.company_name && (
                <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs">
                  {currentDetailFeedback.company_name}
                </span>
              )}
            </div>
            {(isAuthor || isAdmin) && currentDetailFeedback.email && (
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>
                  작성자 이메일:{" "}
                  <a
                    href={`mailto:${currentDetailFeedback.email}`}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    {currentDetailFeedback.email}
                  </a>
                </p>
                <p className="text-xs">이메일은 관리자와 작성자에게만 표시됩니다.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {currentDetailFeedback.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-white/70 p-4 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isUpdateData ? "마지막 수정일" : "등록일"}
              </p>
              <p className="mt-2 text-base text-foreground">
                {formatDateTime(currentDetailFeedback.updated_at)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/70 p-4 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                승인일
              </p>
              <p className="mt-2 text-base text-foreground">
                {currentDetailFeedback.reviewed_at
                  ? formatDateTime(currentDetailFeedback.reviewed_at)
                  : "승인 전"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <h3 className="text-lg font-semibold text-foreground">강점</h3>
            <p className="mt-3 text-sm text-muted-foreground">{currentDetailFeedback.strengths}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <h3 className="text-lg font-semibold text-foreground">질문</h3>
            <p className="mt-3 text-sm text-muted-foreground">{currentDetailFeedback.questions}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <h3 className="text-lg font-semibold text-foreground">개선 제안</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {currentDetailFeedback.suggestions}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <h3 className="text-lg font-semibold text-foreground">승인 정보</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              승인 담당자 :{" "}
              <span className="text-foreground">
                {currentReviewerName ??
                  (currentDetailFeedback.reviewed_by ? "알 수 없는 관리자" : "승인 대기 중")}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {isUpdateData ? "마지막 수정" : "등록"}
              {" : "}
              <span className="text-foreground">
                {formatDateTime(currentDetailFeedback.updated_at)}
              </span>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
