import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, useAlert } from "@/components/ui";
import { inputBaseStyle } from "@/constants";
import { cn } from "@/lib/shared/cn";
import { SendHorizontal, X } from "lucide-react";

type FeedbackCommentFormValues = {
  body: string;
};

type FeedbackCommentFormProps = {
  formId: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
  onSubmit: (body: string) => Promise<void>;
  onSuccess?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
};

export default function FeedbackCommentForm({
  formId,
  label,
  placeholder,
  submitLabel,
  defaultValue = "",
  onSubmit,
  onSuccess,
  onCancel,
  cancelLabel = "취소",
  disabled = false,
  className,
  minHeightClassName = "min-h-[120px]",
}: FeedbackCommentFormProps) {
  const { openAlert } = useAlert();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackCommentFormValues>({
    mode: "onSubmit",
    shouldUnregister: true,
    defaultValues: {
      body: defaultValue,
    },
  });

  const bodyValue = watch("body") ?? "";

  useEffect(() => {
    reset({ body: defaultValue });
  }, [defaultValue, reset]);

  useEffect(() => {
    if (disabled) {
      reset({ body: defaultValue });
    }
  }, [defaultValue, disabled, reset]);

  const handleValidSubmit = async ({ body }: FeedbackCommentFormValues) => {
    try {
      await onSubmit(body.trim());
      reset({ body: defaultValue });
      onSuccess?.();
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "코멘트 처리에 실패했습니다.",
      });
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    reset({ body: defaultValue });
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
        {...register("body", {
          validate: {
            required: (value) => !!value.trim() || "코멘트 내용을 입력해주세요.",
            maxLength: (value) =>
              value.trim().length <= 1000 || "코멘트는 1000자 이하로 작성해주세요.",
          },
        })}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{bodyValue.trim().length}/1000자</p>
          {errors.body && (
            <p className="text-xs text-destructive">{errors.body.message}</p>
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
