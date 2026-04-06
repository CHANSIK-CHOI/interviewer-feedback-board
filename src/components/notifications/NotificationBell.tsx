import { Button, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { cn } from "@/lib/shared/cn";
import { MockNotificationItem } from "@/types/notification";
import { Bell, CheckCheck, MessageSquareText, RefreshCcw, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useNotifications } from "./useNotifications";

const toneStyles: Record<MockNotificationItem["tone"], string> = {
  info: "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
};

function NotificationIcon({ tone }: { tone: MockNotificationItem["tone"] }) {
  if (tone === "success") {
    return <ShieldCheck className="h-4 w-4" />;
  }

  if (tone === "warning") {
    return <RefreshCcw className="h-4 w-4" />;
  }

  return <MessageSquareText className="h-4 w-4" />;
}

export default function NotificationBell() {
  const { notifications, markAllAsRead, markAsRead } = useNotifications();

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative h-auto w-fit shrink-0 rounded-full border-transparent bg-transparent px-2 py-2 shadow-none hover:bg-muted/40 dark:border-transparent dark:bg-transparent sm:h-7 sm:border-input sm:bg-input/30 sm:px-2.5 sm:py-0 sm:hover:bg-input/50"
          aria-label="알림 열기"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background dark:bg-white dark:text-black">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        collisionPadding={32}
        className="w-[calc(100vw-4rem)] max-w-[25rem] rounded-[1.5rem] border-border/70 bg-white/95 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/95 sm:w-[25rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 dark:border-white/10">
          <div>
            <p className="text-sm font-semibold text-foreground">알림함</p>
            <p className="mt-1 text-xs text-muted-foreground">
              승인 상태, 코멘트, 답글 흐름을 여기서 모아봅니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              모두 읽음
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">새로운 알림이 없어요</p>
              <p className="mt-1 text-xs text-muted-foreground">
                승인 상태나 코멘트가 생기면 이곳에 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto overscroll-y-contain [overscroll-behavior-y:contain] px-2 py-2">
            {notifications.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markAsRead(item.id)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                  item.isRead
                    ? "opacity-80 hover:bg-muted/60 hover:opacity-100"
                    : "bg-muted/30 hover:bg-muted/80"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    toneStyles[item.tone]
                  )}
                >
                  <NotificationIcon tone={item.tone} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    {!item.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {item.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                      {item.timeLabel}
                    </span>
                    <span className="text-xs font-medium text-foreground/75 group-hover:text-foreground">
                      열어보기
                    </span>
                  </div>
                </div>
                {index !== notifications.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 bottom-0 hidden h-px bg-border/50 dark:bg-white/10"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
