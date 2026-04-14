import { useFormContext } from "react-hook-form";
import { inputBaseStyle } from "@/constants";
import type { FeedbackFormValues } from "@/types/forms";

export default function FeedbackFormDetailSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FeedbackFormValues>();

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <h3 className="text-lg font-semibold text-foreground">피드백 상세</h3>
      <div className="mt-4 grid gap-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-muted-foreground">
          한줄평
          <input
            type="text"
            placeholder="짧은 요약을 작성해주세요"
            className={inputBaseStyle}
            {...register("summary")}
          />
          {errors.summary && (
            <span className="text-xs text-destructive">{errors.summary.message}</span>
          )}
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-muted-foreground">
          강점
          <textarea
            placeholder="좋았던 점을 구체적으로 적어주세요"
            rows={3}
            className={inputBaseStyle}
            {...register("strengths")}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-muted-foreground">
          질문/궁금한 점
          <textarea
            placeholder="추가로 궁금한 부분이 있나요?"
            rows={3}
            className={inputBaseStyle}
            {...register("questions")}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-muted-foreground">
          개선 제안
          <textarea
            placeholder="개선하면 좋을 점이 있나요?"
            rows={3}
            className={inputBaseStyle}
            {...register("suggestions")}
          />
        </label>
      </div>
    </section>
  );
}
