import React, { useState } from "react";
import { useSession } from "@/components/session";
import {
  ReviewFeedbackAction,
  ReviewFeedbackParams,
  ReviewFeedbackResultWithReviewerName,
  reviewFeedback,
} from "@/lib/feedback/client";
import type { FeedbackPublicRow } from "@/types/feedback";
import { Button, useAlert } from "../ui";
import ReviewActionButton from "./ReviewActionButton";

type ReviewControlsProps = {
  id: string;
  status: FeedbackPublicRow["status"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  onSuccess?: (result: ReviewFeedbackResultWithReviewerName) => void;
};

const APPROVABLE_STATUSES = ["pending", "revised_pending"] as const;
const REOPENABLE_STATUSES = ["approved", "rejected"] as const;

export default function ReviewControls({
  id,
  status,
  size,
  disabled = false,
  onSuccess,
}: ReviewControlsProps) {
  const { openAlert } = useAlert();
  const { getAccessTokenOrThrow } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReview = async (action: ReviewFeedbackAction) => {
    if (disabled || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const accessToken = await getAccessTokenOrThrow();

      const result: ReviewFeedbackResultWithReviewerName = await reviewFeedback({
        feedbackId: id,
        action,
        accessToken,
      } satisfies ReviewFeedbackParams);

      onSuccess?.(result);

      let description;
      switch (action) {
        case "approve":
          description = "피드백을 승인했습니다.";
          break;
        case "reject":
          description = "피드백을 반려했습니다.";
          break;
        case "reopen":
          description = "피드백을 다시 검토 대기로 돌렸습니다.";
          break;
        default:
          description = "피드백 검토 처리에 실패했습니다.";
      }

      openAlert({
        description,
      });
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "피드백 검토 처리에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting;
  const isCanApproveOrReject = APPROVABLE_STATUSES.includes(
    status as (typeof APPROVABLE_STATUSES)[number]
  );
  const isCanReopen = REOPENABLE_STATUSES.includes(status as (typeof REOPENABLE_STATUSES)[number]);

  return (
    <>
      {isCanApproveOrReject && (
        <>
          <ReviewActionButton
            action="reject"
            size={size}
            disabled={isDisabled}
            onClick={() => void handleReview("reject")}
          />
          <ReviewActionButton
            action="approve"
            size={size}
            disabled={isDisabled}
            onClick={() => void handleReview("approve")}
          />
        </>
      )}
      {isCanReopen && (
        <ReviewActionButton
          action="reopen"
          size={size}
          disabled={isDisabled}
          onClick={() => void handleReview("reopen")}
        />
      )}
    </>
  );
}
