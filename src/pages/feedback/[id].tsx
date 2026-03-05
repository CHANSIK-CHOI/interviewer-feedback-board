import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { formatDateTime, ratingStars, statusBadge, statusLabel } from "@/lib/feedback/presentation";
import { checkAvatarApiSrcPrivate, checkSvgImageSrc } from "@/lib/avatar/path";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getFeedbackDetailById, getFeedbackEmailById } from "@/lib/feedback/server";
import type { FeedbackPublicRow } from "@/types";
import { getAuthContextByAccessToken } from "@/lib/auth/server";
import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import { checkUpdateData } from "@/lib/feedback/list";

type FeedbackDetailData = FeedbackPublicRow & {
  email?: string;
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const id = context.params?.id;
  if (typeof id !== "string") {
    return { notFound: true };
  }

  try {
    const detailFeedbacksData: FeedbackPublicRow | null = await getFeedbackDetailById(id);
    if (!detailFeedbacksData) throw new Error("detailFeedbacksData is blank");

    const accessToken = context.req.cookies["sb-access-token"];
    let isAuthor = false;
    let isAdmin = false;
    let mergedDetailData: FeedbackDetailData = detailFeedbacksData;

    if (!accessToken) {
      if (detailFeedbacksData.status !== "approved") return { notFound: true };
    } else {
      const { context: authContext, error: authError } =
        await getAuthContextByAccessToken(accessToken);
      if (authError || !authContext) throw new Error("Auth Context Error");

      isAdmin = authContext.isAdmin;
      isAuthor = authContext.userId === detailFeedbacksData.author_id;

      // approved가 아니면 작성자/관리자만 접근 허용
      if (detailFeedbacksData.status !== "approved" && !isAuthor && !isAdmin)
        return { notFound: true };

      if (isAuthor || isAdmin) {
        const email = await getFeedbackEmailById(id).catch(() => null);
        if (email) {
          mergedDetailData = {
            ...detailFeedbacksData,
            email,
          };
        }
      }
    }

    return {
      props: { detailFeedbacksData: mergedDetailData, isAuthor, isAdmin },
    };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
};

export default function FeedbackDetailPage({
  detailFeedbacksData,
  isAuthor,
  isAdmin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const avatarSrc = detailFeedbacksData.avatar_url || AVATAR_PLACEHOLDER_SRC;
  const isUpdateData = checkUpdateData(detailFeedbacksData);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              피드백 상세
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {detailFeedbacksData.summary}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {(isAuthor || isAdmin) && detailFeedbacksData.email && (
                <p className="text-sm text-muted-foreground">
                  Email:{" "}
                  <a
                    href={`mailto:${detailFeedbacksData.email}`}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    {detailFeedbacksData.email}
                  </a>
                </p>
              )}

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
                <Link href={`/feedback/edit/${detailFeedbacksData.id}`}>수정하기</Link>
              </Button>
            )}
            {isAdmin && (
              <Button type="button" variant="outline">
                삭제
              </Button>
            )}
            {isAdmin &&
              (detailFeedbacksData.status === "pending" ||
                detailFeedbacksData.status === "revised_pending") && (
                <>
                  <Button type="button" variant="outline">
                    반려
                  </Button>
                  <Button type="button">승인</Button>
                </>
              )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(detailFeedbacksData.status)}`}
          >
            {statusLabel(detailFeedbacksData.status)}
          </span>
          <span className="text-sm font-semibold text-amber-500">
            {ratingStars(detailFeedbacksData.rating)}
          </span>
          <span className="text-xs text-muted-foreground">
            수정 {detailFeedbacksData.revision_count}회
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
              <Image
                src={avatarSrc}
                alt={`${detailFeedbacksData.display_name} avatar`}
                width={48}
                height={48}
                unoptimized={checkSvgImageSrc(avatarSrc) || checkAvatarApiSrcPrivate(avatarSrc)}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-base font-semibold text-foreground">
              {detailFeedbacksData.display_name}
            </span>
            {detailFeedbacksData.is_company_public && detailFeedbacksData.company_name && (
              <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs">
                {detailFeedbacksData.company_name}
              </span>
            )}
          </div>
          {(isAuthor || isAdmin) && detailFeedbacksData.email && (
            <p className="text-sm text-muted-foreground">
              작성자 이메일:{" "}
              <a
                href={`mailto:${detailFeedbacksData.email}`}
                className="font-medium text-primary underline underline-offset-4"
              >
                {detailFeedbacksData.email}
              </a>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {detailFeedbacksData.tags.map((tag) => (
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
              {formatDateTime(detailFeedbacksData.updated_at)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/70 p-4 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              승인일
            </p>
            <p className="mt-2 text-base text-foreground">
              {detailFeedbacksData.reviewed_at
                ? formatDateTime(detailFeedbacksData.reviewed_at)
                : "승인 전"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h3 className="text-lg font-semibold text-foreground">강점</h3>
          <p className="mt-3 text-sm text-muted-foreground">{detailFeedbacksData.strengths}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h3 className="text-lg font-semibold text-foreground">질문</h3>
          <p className="mt-3 text-sm text-muted-foreground">{detailFeedbacksData.questions}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h3 className="text-lg font-semibold text-foreground">개선 제안</h3>
          <p className="mt-3 text-sm text-muted-foreground">{detailFeedbacksData.suggestions}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h3 className="text-lg font-semibold text-foreground">승인 정보</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            승인 담당자 :{" "}
            <span className="text-foreground">
              {detailFeedbacksData.reviewed_by ? detailFeedbacksData.reviewed_by : "승인 대기 중"}
            </span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isUpdateData ? "마지막 수정" : "등록"}
            {" : "}
            <span className="text-foreground">
              {formatDateTime(detailFeedbacksData.updated_at)}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
