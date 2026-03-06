import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useSession } from "@/components/session";
import { useAlert } from "@/components/ui";
import { replaceSafely } from "@/lib/navigation/client";
import { getFeedbackDetailById } from "@/lib/feedback/server";
import { AuthContextResult, getAuthContextByAccessToken } from "@/lib/auth/server";
import { getFreshAccessToken } from "@/lib/auth/client";
import {
  AVATAR_PLACEHOLDER_SRC,
  FEEDBACK_FORM_ERROR_MESSAGES,
  FEEDBACK_EDIT_FALLBACK_ERROR_MESSAGE,
  FEEDBACK_FORBIDDEN_MESSAGE,
  FEEDBACK_NOT_FOUND_MESSAGE,
} from "@/constants";
import type { FeedbackFormValues } from "@/types/forms";
import {
  FeedbackFormDetailSection,
  FeedbackFormProfileSection,
  FeedbackFormRatingSection,
  FeedbackFormTagsSection,
  FeedbackEditHeaderSection,
} from "@/components/feedback";
import { FeedbackPublicRow } from "@/types/feedback";
import { EditFeedbackResponse } from "@/types/response";

const feedbackEditErrorMessages = new Set<string>([
  ...Object.values(FEEDBACK_FORM_ERROR_MESSAGES),
  FEEDBACK_NOT_FOUND_MESSAGE,
  FEEDBACK_FORBIDDEN_MESSAGE,
]);

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const feedbackId = context.params?.id;
  if (typeof feedbackId !== "string") {
    return { notFound: true };
  }

  const accessToken = context.req.cookies["sb-access-token"];
  if (!accessToken) {
    return {
      redirect: {
        destination: `/login?next=/feedback/edit/${feedbackId}`,
        permanent: false, // 영구 이동 아님 이라고 알려서 캐시 고정하지 않게 함
      },
    };
  }

  try {
    const authResult: AuthContextResult = await getAuthContextByAccessToken(accessToken);
    const { context: authContext, error: authError } = authResult;

    if (authError || !authContext) {
      return {
        redirect: {
          destination: `/login?next=/feedback/edit/${feedbackId}`,
          permanent: false,
        },
      };
    }

    const feedback: FeedbackPublicRow = await getFeedbackDetailById(feedbackId);

    if (feedback.author_id !== authContext.userId) {
      return { notFound: true };
    }

    const defaultValues: FeedbackFormValues = {
      display_name: feedback.display_name,
      company_name: feedback.company_name ?? "",
      is_company_public: feedback.is_company_public,
      avatar: feedback.avatar_url ?? AVATAR_PLACEHOLDER_SRC,
      rating: feedback.rating,
      summary: feedback.summary,
      strengths: feedback.strengths ?? "",
      questions: feedback.questions ?? "",
      suggestions: feedback.suggestions ?? "",
      tags: Array.isArray(feedback.tags) ? feedback.tags : [],
    };

    return {
      props: {
        feedbackId,
        defaultValues,
      },
    };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
};

export default function FeedbackEditPage({
  feedbackId,
  defaultValues,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { session, supabaseClient } = useSession();
  const { openAlert } = useAlert();
  const router = useRouter();

  const formMethods = useForm<FeedbackFormValues>({
    mode: "onSubmit",
    defaultValues,
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = formMethods;

  const onSubmit = async (values: FeedbackFormValues) => {
    if (!session?.access_token) {
      openAlert({
        description: "로그인이 필요합니다.",
        onOk: () => {
          replaceSafely(router, `/login?next=/feedback/edit/${feedbackId}`);
        },
      });
      return;
    }

    try {
      const accessToken = await getFreshAccessToken({
        supabaseClient,
        fallbackAccessToken: session.access_token,
      });

      if (!accessToken) {
        throw new Error("로그인 상태를 확인해주세요.");
      }

      const response = await fetch(`/api/feedbacks/${feedbackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });

      const result: EditFeedbackResponse = await response
        .json()
        .catch(() => ({ data: null, error: "Invalid response" }));

      if (!response.ok || result.error) {
        throw new Error(result.error ?? FEEDBACK_EDIT_FALLBACK_ERROR_MESSAGE);
      }

      openAlert({
        description: "피드백이 수정되었습니다.\n승인 검토가 다시 진행됩니다.",
        onOk: () => {
          void replaceSafely(router, `/feedback/${feedbackId}`);
        },
      });
    } catch (error) {
      console.error(error);
      const description =
        error instanceof Error && feedbackEditErrorMessages.has(error.message)
          ? error.message
          : FEEDBACK_EDIT_FALLBACK_ERROR_MESSAGE;

      openAlert({
        description,
      });
    }
  };

  return (
    <FormProvider {...formMethods}>
      <div className="flex flex-col gap-6">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
          <FeedbackEditHeaderSection feedbackId={feedbackId} isSubmitting={isSubmitting} />
          <FeedbackFormProfileSection sessionAvatar={defaultValues.avatar} />
          <FeedbackFormRatingSection />
          <FeedbackFormDetailSection />
          <FeedbackFormTagsSection />
        </form>
      </div>
    </FormProvider>
  );
}
