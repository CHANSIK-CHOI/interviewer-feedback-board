import {
  CircleAlert,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/shared/cn";
import type { NotificationTone } from "@/lib/notification/presentation";

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
