import React, { useState } from "react";
import { useSession } from "@/components/session";
import { Button, useAlert } from "../ui";
import { getFreshAccessToken } from "@/lib/auth/client";
import { ReviewFeedbackResultWithReviewerName, reviewFeedback } from "@/lib/feedback/client";

type RejectButtonProps = {
  size?: React.ComponentProps<typeof Button>["size"];
  id: string;
  onSuccess?: (result: ReviewFeedbackResultWithReviewerName) => void;
};

export default function RejectButton({ size, id, onSuccess }: RejectButtonProps) {
  const { openAlert } = useAlert();
  const { session, supabaseClient } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async () => {
    if (isSubmitting) return;

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

    try {
      setIsSubmitting(true);

      const result: ReviewFeedbackResultWithReviewerName = await reviewFeedback({
        feedbackId: id,
        action: "reject",
        accessToken,
      });
      onSuccess?.(result);

      openAlert({
        description: "피드백을 반려했습니다.",
      });
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "피드백 반려 처리에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={isSubmitting}
      onClick={handleReject}
    >
      {isSubmitting ? "반려 중..." : "반려"}
    </Button>
  );
}
