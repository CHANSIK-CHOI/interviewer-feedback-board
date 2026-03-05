import { useFormContext, useWatch } from "react-hook-form";
import { TAG_OPTIONS, chipButtonBaseStyle } from "@/constants";
import { cn } from "@/lib/shared/cn";
import type { FeedbackFormValues } from "@/types";

export default function FeedbackFormTagsSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FeedbackFormValues>();

  const tagsValue = useWatch({ control, name: "tags" });

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <h3 className="text-lg font-semibold text-foreground">키워드 선택</h3>
      <p className="mt-1 text-sm text-muted-foreground">해당되는 키워드를 골라주세요.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TAG_OPTIONS.map((tag) => {
          const isSelected = (tagsValue ?? []).includes(tag);
          return (
            <label
              key={tag}
              htmlFor={`tag_${tag}`}
              className={cn(chipButtonBaseStyle, "text-xs", {
                "border-primary bg-primary/10 text-primary": isSelected,
              })}
            >
              <input
                id={`tag_${tag}`}
                type="checkbox"
                value={tag}
                className="sr-only"
                {...register("tags", {
                  validate: (v) => (v?.length ?? 0) > 0 || "키워드를 1개 이상 선택해주세요.",
                })}
              />
              # {tag}
            </label>
          );
        })}
      </div>
      {errors.tags && <p className="mt-2 text-xs text-destructive">{errors.tags.message}</p>}
    </section>
  );
}
