import { cn } from "@/lib/shared/cn";
import type { NotificationType } from "@/types/notification";
import {
  CircleAlert,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

export type NotificationTone = "info" | "success" | "warning" | "danger";

export const NOTIFICATION_TONE_BY_TYPE: Record<NotificationType, NotificationTone> = {
  feedback_submitted: "warning",
  feedback_resubmitted: "warning",
  feedback_approved: "success",
  feedback_rejected: "danger",
  feedback_comment: "info",
  feedback_reply: "info",
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  feedback_submitted: "승인 요청",
  feedback_resubmitted: "재승인 요청",
  feedback_approved: "승인 완료",
  feedback_rejected: "반려",
  feedback_comment: "코멘트",
  feedback_reply: "답글",
};

export const NOTIFICATION_TONE_STYLE: Record<NotificationTone, string> = {
  info: "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
};

type NotificationIconProps = {
  tone: NotificationTone;
  className?: string;
};

export function NotificationIcon({ tone, className }: NotificationIconProps) {
  if (tone === "success") {
    return <ShieldCheck className={cn("h-4 w-4", className)} />;
  }

  if (tone === "warning") {
    return <RefreshCcw className={cn("h-4 w-4", className)} />;
  }

  if (tone === "danger") {
    return <CircleAlert className={cn("h-4 w-4", className)} />;
  }

  return <MessageSquareText className={cn("h-4 w-4", className)} />;
}
