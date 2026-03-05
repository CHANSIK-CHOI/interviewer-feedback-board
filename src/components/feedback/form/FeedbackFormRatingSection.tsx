import { useFormContext, useWatch } from "react-hook-form";
import { chipButtonBaseStyle } from "@/constants";
import { cn } from "@/lib/shared/cn";
import type { FeedbackFormValues } from "@/types";

export default function FeedbackFormRatingSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FeedbackFormValues>();

  const ratingValue = useWatch({ control, name: "rating" });

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <h3 className="text-lg font-semibold text-foreground">평점</h3>
      <p className="mt-1 text-sm text-muted-foreground">1점(개선 필요) ~ 5점(매우 우수)</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <label
            key={value}
            htmlFor={`chipValue_${value}`}
            className={cn(chipButtonBaseStyle, {
              "border-primary bg-primary/10 text-primary": value === Number(ratingValue),
            })}
          >
            <input
              id={`chipValue_${value}`}
              type="radio"
              value={value}
              className="sr-only"
              {...register("rating", {
                setValueAs: (v) => Number(v),
                validate: (v) => v > 0 || "평점을 선택해주세요.",
              })}
            />
            {value}점
          </label>
        ))}
      </div>
      {errors.rating && <p className="mt-2 text-xs text-destructive">{errors.rating.message}</p>}
    </section>
  );
}
