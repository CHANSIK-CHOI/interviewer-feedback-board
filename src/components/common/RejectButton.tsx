import React from "react";
import { Button } from "../ui";
import ReviewActionButton from "./ReviewActionButton";

type RejectButtonProps = {
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  onClick: () => void;
};

export default function RejectButton({ size, disabled, onClick }: RejectButtonProps) {
  return (
    <ReviewActionButton action="reject" size={size} disabled={disabled} onClick={onClick} />
  );
}
