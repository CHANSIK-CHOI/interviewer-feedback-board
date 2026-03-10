import React from "react";
import { FormProvider } from "react-hook-form";
import { PageMeta } from "@/components/common";
import { MyPageHeaderSection, MyProfileEditorSection } from "@/components/my";
import { useMyProfileController } from "@/hooks/my/useMyProfileController";

export default function MyPage() {
  const { formMethods, isLoading, viewModel, actions } = useMyProfileController();

  if (isLoading) {
    return (
      <>
        <PageMeta
          title="내 정보"
          ogTitle="내 정보"
          description="내 프로필과 공개 설정을 관리할 수 있는 페이지입니다."
        />

        <div className="mx-auto w-full max-w-xl">
          <section className="rounded-2xl border border-border/60 bg-background/80 p-7 text-sm text-muted-foreground shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            로그인 상태를 확인하고 있습니다.
          </section>
        </div>
      </>
    );
  }

  return (
    <FormProvider {...formMethods}>
      <PageMeta
        title="내 정보"
        ogTitle="내 정보"
        description="내 프로필과 공개 설정을 관리할 수 있는 페이지입니다."
      />

      <div className="mx-auto w-full max-w-2xl">
        <MyPageHeaderSection />
        <MyProfileEditorSection viewModel={viewModel} actions={actions} />
      </div>
    </FormProvider>
  );
}
