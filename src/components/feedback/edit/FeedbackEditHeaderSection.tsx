import Link from "next/link";
import { Button } from "@/components/ui";

type FeedbackEditHeaderSectionProps = {
  feedbackId: string;
  isSubmitting: boolean;
};

export default function FeedbackEditHeaderSection({
  feedbackId,
  isSubmitting,
}: FeedbackEditHeaderSectionProps) {
  return (
    <section className="sticky top-0 z-30 rounded-2xl border border-border/60 bg-background p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">피드백 수정</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            수정 후에는 다시 승인 대기 상태로 전환되며, 승인 후 공개됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/feedback/${feedbackId}`}>상세로</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            수정 완료
          </Button>
        </div>
      </div>
    </section>
  );
}
