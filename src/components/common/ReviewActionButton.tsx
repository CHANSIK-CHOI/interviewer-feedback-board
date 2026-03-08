import React from "react";
import { ReviewFeedbackAction } from "@/lib/feedback/client";
import { Button } from "../ui";

type ReviewActionButtonProps = {
  size?: React.ComponentProps<typeof Button>["size"];
  action: ReviewFeedbackAction;
  disabled?: boolean;
  onClick: () => void;
};

const reviewActionButtonConfig: Record<
  ReviewFeedbackAction,
  {
    label: string;
    variant: React.ComponentProps<typeof Button>["variant"];
  }
> = {
  approve: {
    label: "승인",
    variant: "default",
  },
  reject: {
    label: "반려",
    variant: "outline",
  },
};

export default function ReviewActionButton({
  size,
  action,
  disabled = false,
  onClick,
}: ReviewActionButtonProps) {
  const { label, variant } = reviewActionButtonConfig[action];

  return (
    <Button type="button" size={size} variant={variant} disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}
