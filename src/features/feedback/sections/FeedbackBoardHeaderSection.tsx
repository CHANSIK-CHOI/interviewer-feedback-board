import React from "react";
import Link from "next/link";
import { NewFeedbackLinkBtn } from "@/components/feedback";
import { Button, Select } from "@/components/ui";
import type { FeedbackSortType } from "@/features/feedback/types";

type FeedbackBoardHeaderSectionProps = {
  sortType: FeedbackSortType;
  onSortTypeChange: (value: FeedbackSortType) => void;
  isAdminUi: boolean;
  isRoleLoading: boolean;
};

export default function FeedbackBoardHeaderSection({
  sortType,
  onSortTypeChange,
  isAdminUi,
  isRoleLoading,
}: FeedbackBoardHeaderSectionProps) {
  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">인터뷰어 피드백 보드</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            승인된 피드백은 공개 보드에 노출되고, 승인 대기 중인 피드백은 상태 배지가 표시됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={sortType} onValueChange={onSortTypeChange}>
            <Select.Trigger className="w-[170px] bg-background">
              <Select.Value placeholder="정렬 선택" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="updated_desc">최신 수정순</Select.Item>
              <Select.Item value="updated_asc">오래된 수정순</Select.Item>
            </Select.Content>
          </Select>
          <NewFeedbackLinkBtn />
          {!isRoleLoading && isAdminUi && (
            <Button asChild>
              <Link href="/admin/feedback">관리자 보기</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
