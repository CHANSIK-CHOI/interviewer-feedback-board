import React from "react";
import FeedbackCommentForm from "@/components/feedback/detail/FeedbackCommentForm";

type FeedbackCommentComposerProps = {
  feedbackId: string;
  title: string;
  description: string;
  placeholder: string;
  canWrite: boolean;
  onSubmit: (body: string) => Promise<void>;
};

export default function FeedbackCommentComposer({
  feedbackId,
  title,
  description,
  placeholder,
  canWrite,
  onSubmit,
}: FeedbackCommentComposerProps) {
  return (
    <aside className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Composer</p>
      <h4 className="mt-2 text-lg font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>

      <FeedbackCommentForm
        key={feedbackId}
        formId={`feedback-comment-draft-${feedbackId}`}
        label="새 코멘트"
        placeholder={placeholder}
        submitLabel="코멘트 등록"
        disabled={!canWrite}
        onSubmit={onSubmit}
        className="mt-5 p-0"
        minHeightClassName="min-h-[160px]"
      />
    </aside>
  );
}
