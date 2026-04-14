import React from "react";
import { useRouter } from "next/router";
import { useBoolean } from "usehooks-ts";
import { useSession } from "@/components/session";
import { replaceSafely } from "@/lib/navigation/client";
import { DeleteFeedbackResult, deleteFeedback } from "@/lib/feedback/client";
import { Button, useAlert, useConfirm } from "../ui";

type DeleteFeedbackButtonProps = {
  id: string;
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  redirectTo?: string;
  onSuccess?: (result: DeleteFeedbackResult) => void;
};

export default function DeleteFeedbackButton({
  id,
  size,
  disabled = false,
  redirectTo,
  onSuccess,
}: DeleteFeedbackButtonProps) {
  const router = useRouter();
  const { openAlert } = useAlert();
  const { openConfirm } = useConfirm();
  const { getAccessTokenOrThrow } = useSession();
  const {
    value: isSubmitting,
    setFalse: stopSubmitting,
    setTrue: startSubmitting,
  } = useBoolean(false);

  const handleDelete = async () => {
    if (disabled || isSubmitting) return;

    const isConfirmed = await openConfirm({
      title: "피드백 삭제 확인",
      description: "삭제한 피드백은 복구할 수 없습니다.\n정말 삭제하시겠어요?",
      actionText: "삭제",
      cancelText: "취소",
    });

    if (!isConfirmed) return;

    startSubmitting();

    try {
      const accessToken = await getAccessTokenOrThrow();

      const result: DeleteFeedbackResult = await deleteFeedback({
        feedbackId: id,
        accessToken,
      });

      onSuccess?.(result);

      openAlert({
        description: "피드백을 삭제했습니다.",
        onOk: redirectTo
          ? () => {
              void replaceSafely(router, redirectTo);
            }
          : undefined,
      });
    } catch (error) {
      openAlert({
        description: error instanceof Error ? error.message : "피드백 삭제에 실패했습니다.",
      });
    } finally {
      stopSubmitting();
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size={size}
      disabled={disabled || isSubmitting}
      onClick={() => void handleDelete()}
    >
      삭제
    </Button>
  );
}
