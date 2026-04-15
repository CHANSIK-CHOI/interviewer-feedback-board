import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useSession } from "@/components/session";
import { useAlert } from "@/components/ui";
import { buildLoginHref, replaceSafely } from "@/lib/navigation/client";
import { getFeedbackDetailById } from "@/lib/feedback/server";
import { AuthContextResult, resolveAuthContextByAccessToken } from "@/lib/auth/server";
import { parseApiResponse } from "@/lib/api/response";
import { idDataSchema } from "@/lib/api/schemas";
import {
  AVATAR_PLACEHOLDER_SRC,
  FEEDBACK_FORM_ERROR_MESSAGES,
  FEEDBACK_EDIT_FALLBACK_ERROR_MESSAGE,
  FEEDBACK_FORBIDDEN_MESSAGE,
  FEEDBACK_NOT_FOUND_MESSAGE,
} from "@/constants";
import type { FeedbackFormValues } from "@/types/forms";
import { feedbackFormSchema } from "@/lib/forms/feedback";
import {
  FeedbackFormDetailSection,
  FeedbackFormProfileSection,
  FeedbackFormRatingSection,
  FeedbackFormTagsSection,
  FeedbackEditHeaderSection,
} from "@/components/feedback";
import { PageMeta } from "@/components/common";
import { EditFeedbackResponse } from "@/types/response";
import { zodResolver } from "@hookform/resolvers/zod";

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
        destination: buildLoginHref(`/feedback/edit/${feedbackId}`),
        permanent: false,
      },
    };
  }

  const authResult: AuthContextResult = await resolveAuthContextByAccessToken(accessToken);
  const { context: authContext, error: authError } = authResult;
  if (authError || !authContext) {
    return {
      redirect: {
        destination: buildLoginHref(`/feedback/edit/${feedbackId}`),
        permanent: false,
      },
    };
  }

  try {
    const feedback = await getFeedbackDetailById(feedbackId, {
      supabaseClient: authContext.supabaseServerUserClient,
    });

    if (!feedback || feedback.author_id !== authContext.userId) {
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
  const { session, getAccessTokenOrThrow } = useSession();
  const { openAlert } = useAlert();
  const router = useRouter();

  const formMethods = useForm<FeedbackFormValues>({
    mode: "onSubmit",
    resolver: zodResolver(feedbackFormSchema),
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
          replaceSafely(router, buildLoginHref(`/feedback/edit/${feedbackId}`));
        },
      });
      return;
    }

    try {
      const accessToken = await getAccessTokenOrThrow();

      const response = await fetch(`/api/feedbacks/${feedbackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });

      const result: EditFeedbackResponse = await parseApiResponse(response, idDataSchema);

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
      <PageMeta
        title="피드백 수정"
        ogTitle="피드백 수정"
        description="작성한 피드백을 수정하고 다시 검토를 요청할 수 있습니다."
      />

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
