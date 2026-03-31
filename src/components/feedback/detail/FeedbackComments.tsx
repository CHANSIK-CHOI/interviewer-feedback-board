import FeedbackCommentsComposer from "@/components/feedback/detail/FeedbackComments.Composer";
import FeedbackCommentsForm from "@/components/feedback/detail/FeedbackComments.Form";
import FeedbackCommentsItem from "@/components/feedback/detail/FeedbackComments.Item";
import FeedbackCommentsProvider, {
  useFeedbackCommentsMeta,
  useFeedbackCommentsState,
} from "@/components/feedback/detail/FeedbackComments.Provider";
import { cn } from "@/lib/shared/cn";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";
import type { FeedbackComment } from "@/types/feedback-comment";
import { Lock, MessageCircle } from "lucide-react";

type FeedbackCommentsProps = {
  feedback: FeedbackPublicAndEmailRow;
  isAuthor: boolean;
  isAdmin: boolean;
  serverComments: FeedbackComment[];
};

type FeedbackCommentsComponent = ((props: FeedbackCommentsProps) => JSX.Element) & {
  Provider: typeof FeedbackCommentsProvider;
  Composer: typeof FeedbackCommentsComposer;
  Item: typeof FeedbackCommentsItem;
  Form: typeof FeedbackCommentsForm;
};

const FeedbackComments = Object.assign(
  function FeedbackComments({
    feedback,
    isAuthor,
    isAdmin,
    serverComments,
  }: FeedbackCommentsProps) {
    return (
      <FeedbackCommentsProvider
        feedback={feedback}
        isAuthor={isAuthor}
        isAdmin={isAdmin}
        serverComments={serverComments}
      >
        <FeedbackCommentsContent />
      </FeedbackCommentsProvider>
    );
  },
  {
    Provider: FeedbackCommentsProvider,
    Composer: FeedbackCommentsComposer,
    Item: FeedbackCommentsItem,
    Form: FeedbackCommentsForm,
  }
) as FeedbackCommentsComponent;

export default FeedbackComments;

function FeedbackCommentsContent() {
  const { commentItems, firstDepthCommentIds, firstDepthCount, replyCount } =
    useFeedbackCommentsState();
  const { hasCommentsBeenUnlocked, canEveryoneReadComments } = useFeedbackCommentsMeta();

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comments
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">코멘트</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            승인된 공개 피드백에서는 모두가 코멘트를 읽을 수 있고, 작성은 게시물 작성자와 관리자만
            가능합니다.
          </p>
        </div>

        <div className="grid min-w-[220px] gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              전체
            </p>
            <strong className="mt-2 block text-xl font-semibold text-foreground">
              {commentItems.length}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              댓글
            </p>
            <strong className="mt-2 block text-xl font-semibold text-foreground">
              {firstDepthCount}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              답글
            </p>
            <strong className="mt-2 block text-xl font-semibold text-foreground">
              {replyCount}
            </strong>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
            canEveryoneReadComments
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-500/12 text-slate-700 dark:text-slate-300"
          )}
        >
          {canEveryoneReadComments ? (
            <MessageCircle className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
          )}
          {canEveryoneReadComments ? "전체 공개 코멘트" : "작성자 · 관리자 전용 열람"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {!hasCommentsBeenUnlocked && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 p-6 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              최초 승인 이후부터 코멘트 스레드가 열립니다.
            </div>
          )}

          {hasCommentsBeenUnlocked && firstDepthCommentIds.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 p-6 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              아직 등록된 코멘트가 없습니다. 승인 상태일 때 작성자나 관리자가 첫 코멘트를 남길 수
              있습니다.
            </div>
          )}

          {hasCommentsBeenUnlocked &&
            firstDepthCommentIds.map((commentId) => (
              <FeedbackComments.Item key={commentId} commentId={commentId} />
            ))}
        </div>

        <FeedbackComments.Composer />
      </div>
    </section>
  );
}
