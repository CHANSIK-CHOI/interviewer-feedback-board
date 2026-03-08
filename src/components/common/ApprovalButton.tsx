import React from "react";
import { Button } from "../ui";
import ReviewActionButton from "./ReviewActionButton";

type ApprovalButtonProps = {
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  onClick: () => void;
};

export default function ApprovalButton({ size, disabled, onClick }: ApprovalButtonProps) {
  return (
    <ReviewActionButton action="approve" size={size} disabled={disabled} onClick={onClick} />
  );
}
