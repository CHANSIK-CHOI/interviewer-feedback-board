import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useSession } from "@/components/session";
import {
  FEEDBACK_FORM_ERROR_MESSAGES,
  NEW_FEEDBACK_DEFAULT_VALUES,
  NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE,
} from "@/constants";
import { getUserCompany, getUserName, getAvatarUrl } from "@/lib/user/profile";
import type { FeedbackFormValues } from "@/types/forms";
import {
  FeedbackFormDetailSection,
  FeedbackFormProfileSection,
  FeedbackFormRatingSection,
  FeedbackFormTagsSection,
  FeedbackNewHeaderSection,
} from "@/components/feedback";
import { useAlert } from "@/components/ui";
import { replaceSafely } from "@/lib/navigation/client";
import { useRouter } from "next/router";
import { CreateFeedbackResponse } from "@/types/response";

const newFeedbackErrorMessages = new Set<string>(Object.values(FEEDBACK_FORM_ERROR_MESSAGES));

export default function FeedbackNewPage() {
  const { session } = useSession();
  const { openAlert } = useAlert();
  const user = session?.user;
  const router = useRouter();

  const formMethods = useForm<FeedbackFormValues>({
    mode: "onSubmit",
    defaultValues: NEW_FEEDBACK_DEFAULT_VALUES,
  });
  const {
    reset,
    getValues,
    handleSubmit,
    formState: { isSubmitting },
  } = formMethods;

  const sessionUserName = getUserName(user);
  const sessionAvatar = getAvatarUrl(user);
  const { sessionCompanyName, sessionIsCompanyPublic } = getUserCompany(user);

  useEffect(() => {
    reset(
      {
        ...getValues(),
        display_name: sessionUserName,
        avatar: sessionAvatar,
        is_company_public: sessionIsCompanyPublic,
        company_name: sessionCompanyName,
      },
      { keepDirtyValues: true }
    );
  }, [
    reset,
    getValues,
    sessionUserName,
    sessionAvatar,
    sessionCompanyName,
    sessionIsCompanyPublic,
  ]);

  const onSubmit = async (values: FeedbackFormValues) => {
    if (!session?.access_token) {
      openAlert({
        description: "로그인이 필요합니다.",
        onOk: () => {
          void replaceSafely(router, "/login?next=/feedback/new");
        },
      });
      return;
    }

    try {
      const response = await fetch("/api/feedbacks/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(values),
      });

      const result: CreateFeedbackResponse = await response
        .json()
        .catch(() => ({ data: null, error: "Invalid response" }));

      if (!response.ok || result.error) {
        throw new Error(result.error ?? "피드백 등록 실패");
      }

      openAlert({
        description: "피드백이 등록되었습니다.\n관리자 승인 후 전체 공개됩니다.",
        onOk: () => {
          void replaceSafely(router, "/feedback");
        },
      });
    } catch (error) {
      console.error(error);
      const description =
        error instanceof Error && newFeedbackErrorMessages.has(error.message)
          ? error.message
          : NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE;
      openAlert({
        description,
      });
    }
  };

  return (
    <FormProvider {...formMethods}>
      <div className="flex flex-col gap-6">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
          <FeedbackNewHeaderSection isSubmitting={isSubmitting} />
          <FeedbackFormProfileSection sessionAvatar={sessionAvatar} />
          <FeedbackFormRatingSection />
          <FeedbackFormDetailSection />
          <FeedbackFormTagsSection />
        </form>
      </div>
    </FormProvider>
  );
}
