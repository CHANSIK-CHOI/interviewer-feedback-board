import Link from "next/link";
import { Button } from "@/components/ui";

export default function MyPageHeaderSection() {
  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-7 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">마이페이지</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            회원 정보를 확인하고 수정할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/feedback">피드백 목록으로 이동하기</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/my/withdraw">회원 탈퇴</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
