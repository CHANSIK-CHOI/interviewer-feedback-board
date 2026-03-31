import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useFeedbackCommentsActions,
  useFeedbackCommentsMeta,
} from "@/components/feedback/detail/FeedbackComments.Provider";
import { Button, useAlert } from "@/components/ui";
import { inputBaseStyle } from "@/constants";
import { cn } from "@/lib/shared/cn";
import { SendHorizontal } from "lucide-react";

type FeedbackCommentsComposerValues = {
  newCommentText: string;
};

export default function FeedbackCommentsComposer() {
  const { openAlert } = useAlert();
  const {
    feedbackId,
    composerTitle,
    composerDescription,
    composerPlaceholder,
    canWrite,
  } = useFeedbackCommentsMeta();
  const { createComment } = useFeedbackCommentsActions();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackCommentsComposerValues>({
    mode: "onSubmit",
    shouldUnregister: true,
    defaultValues: {
      newCommentText: "",
    },
  });

  const newCommentTextValue = watch("newCommentText") ?? "";

  useEffect(() => {
    reset({ newCommentText: "" });
  }, [feedbackId, reset]);

  useEffect(() => {
    if (canWrite) return;
    reset({ newCommentText: "" });
  }, [canWrite, reset]);

  const handleValidSubmit = async ({ newCommentText }: FeedbackCommentsComposerValues) => {
    try {
      await createComment(newCommentText.trim());
      reset({ newCommentText: "" });
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "코멘트 처리에 실패했습니다.",
      });
    }
  };

  return (
    <aside className="rounded-2xl border border-border/60 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Composer
      </p>
      <h4 className="mt-2 text-lg font-semibold text-foreground">{composerTitle}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{composerDescription}</p>

      <form onSubmit={handleSubmit(handleValidSubmit)} className="mt-5 rounded-2xl p-0">
        <label
          htmlFor={`feedback-comment-draft-${feedbackId}`}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          새 코멘트
        </label>
        <textarea
          id={`feedback-comment-draft-${feedbackId}`}
          placeholder={composerPlaceholder}
          disabled={!canWrite || isSubmitting}
          className={cn(inputBaseStyle, "mt-3 min-h-[160px] resize-none")}
          maxLength={1000}
          {...register("newCommentText", {
            validate: {
              required: (value) => !!value.trim() || "코멘트 내용을 입력해주세요.",
              maxLength: (value) =>
                value.trim().length <= 1000 || "코멘트는 1000자 이하로 작성해주세요.",
            },
          })}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{newCommentTextValue.trim().length}/1000자</p>
            {errors.newCommentText && (
              <p className="text-xs text-destructive">{errors.newCommentText.message}</p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={!canWrite || isSubmitting}>
            <SendHorizontal className="size-3.5" />
            코멘트 등록
          </Button>
        </div>
      </form>
    </aside>
  );
}
