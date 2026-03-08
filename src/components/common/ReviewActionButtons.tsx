import React, { useState } from "react";
import { useSession } from "@/components/session";
import { getFreshAccessToken } from "@/lib/auth/client";
import {
  ReviewFeedbackAction,
  ReviewFeedbackParams,
  ReviewFeedbackResultWithReviewerName,
  reviewFeedback,
} from "@/lib/feedback/client";
import { useAlert } from "../ui";
import ApprovalButton from "./ApprovalButton";
import RejectButton from "./RejectButton";

type ReviewActionButtonsProps = {
  id: string;
  size?: React.ComponentProps<typeof ApprovalButton>["size"];
  onSuccess?: (result: ReviewFeedbackResultWithReviewerName) => void;
};

export default function ReviewActionButtons({ id, size, onSuccess }: ReviewActionButtonsProps) {
  const { openAlert } = useAlert();
  const { session, supabaseClient } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReview = async (action: ReviewFeedbackAction) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const accessToken = await getFreshAccessToken({
        supabaseClient,
        fallbackAccessToken: session?.access_token ?? null,
      });

      if (!accessToken) {
        openAlert({
          description: "로그인 상태를 확인해주세요.",
        });
        return;
      }

      const result: ReviewFeedbackResultWithReviewerName = await reviewFeedback({
        feedbackId: id,
        action,
        accessToken,
      } satisfies ReviewFeedbackParams);

      onSuccess?.(result);

      openAlert({
        description: action === "approve" ? "피드백을 승인했습니다." : "피드백을 반려했습니다.",
      });
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "피드백 검토 처리에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <RejectButton
        size={size}
        disabled={isSubmitting}
        onClick={() => void handleReview("reject")}
      />
      <ApprovalButton
        size={size}
        disabled={isSubmitting}
        onClick={() => void handleReview("approve")}
      />
    </>
  );
}
