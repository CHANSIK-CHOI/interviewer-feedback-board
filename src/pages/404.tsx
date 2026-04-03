import React from "react";
import { PageMeta } from "@/components/common";

export default function NotFoundPage() {
  return (
    <>
      <PageMeta
        title="404"
        ogTitle="페이지를 찾을 수 없음"
        description="요청한 페이지를 찾을 수 없습니다."
      />

      <div className="mx-auto w-full max-w-xl">
        <section className="rounded-2xl border border-border/60 bg-white/80 p-7 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          존재하지 않는 페이지입니다.
        </section>
      </div>
    </>
  );
}
