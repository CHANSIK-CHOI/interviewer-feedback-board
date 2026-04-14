import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, useAlert } from "@/components/ui";
import { inputBaseStyle } from "@/constants";
import { cn } from "@/lib/shared/cn";
import { SendHorizontal, X } from "lucide-react";
import { feedbackCommentFormSchema, type FeedbackCommentsFormValues } from "@/lib/forms/feedback";

type FeedbackCommentsFormProps = {
  formId: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
  onSubmitText: (commentText: string) => Promise<void>;
  onSuccess?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
};

export default function FeedbackCommentsForm({
  formId,
  label,
  placeholder,
  submitLabel,
  defaultValue = "",
  onSubmitText,
  onSuccess,
  onCancel,
  cancelLabel = "취소",
  disabled = false,
  className,
  minHeightClassName = "min-h-[120px]",
}: FeedbackCommentsFormProps) {
  const { openAlert } = useAlert();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackCommentsFormValues>({
    mode: "onSubmit",
    resolver: zodResolver(feedbackCommentFormSchema),
    shouldUnregister: true,
    defaultValues: {
      commentText: defaultValue,
    },
  });

  const commentTextValue = watch("commentText") ?? "";

  useEffect(() => {
    reset({ commentText: defaultValue });
  }, [defaultValue, reset]);

  useEffect(() => {
    if (disabled) {
      reset({ commentText: defaultValue });
    }
  }, [defaultValue, disabled, reset]);

  const handleValidSubmit = async ({ commentText }: FeedbackCommentsFormValues) => {
    try {
      await onSubmitText(commentText);
      reset({ commentText: defaultValue });
      onSuccess?.();
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "코멘트 처리에 실패했습니다.",
      });
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    reset({ commentText: defaultValue });
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className={cn("rounded-2xl p-4", className)}>
      <label
        htmlFor={formId}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <textarea
        id={formId}
        placeholder={placeholder}
        disabled={disabled || isSubmitting}
        className={cn(inputBaseStyle, "mt-3 resize-none", minHeightClassName)}
        maxLength={1000}
        {...register("commentText")}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{commentTextValue.trim().length}/1000자</p>
          {errors.commentText && (
            <p className="text-xs text-destructive">{errors.commentText.message}</p>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={handleCancel}
            >
              <X className="size-3.5" />
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={disabled || isSubmitting}>
            <SendHorizontal className="size-3.5" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
