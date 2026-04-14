import { Button, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { formatDateTime } from "@/lib/feedback/presentation";
import {
  NOTIFICATION_TONE_BY_TYPE,
  NOTIFICATION_TONE_STYLE,
} from "@/lib/notification/presentation";
import { cn } from "@/lib/shared/cn";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useBoolean } from "usehooks-ts";
import { useNotifications } from "./context";
import { NotificationIcon } from "./NotificationIcon";

export default function NotificationBell() {
  const { notifications, markIdsAsRead } = useNotifications();
  const { value: open, setFalse: closePopover, setValue: setOpen } = useBoolean(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const handleClickNotiItemLink = () => {
    closePopover();
  };

  const handleOpenChangePopover = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      const unreadIds = notifications.filter((noti) => !noti.is_read).map((unread) => unread.id);
      if (unreadIds.length == 0) return;
      markIdsAsRead(unreadIds);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChangePopover}>
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
        <div className="flex items-start justify-end gap-4 border-b border-border/60 px-5 py-4 dark:border-white/10">
          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
            >
              <Link href="/notifications" onClick={closePopover}>
                알림함으로 이동
              </Link>
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
            {notifications.map((item, index) => {
              const { type } = item;
              const tone = NOTIFICATION_TONE_BY_TYPE[type];

              return (
                <Link
                  key={item.id}
                  href={item.link}
                  onClick={handleClickNotiItemLink}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                    item.is_read
                      ? "opacity-80 hover:bg-muted/60 hover:opacity-100"
                      : "bg-muted/30 hover:bg-muted/80"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      NOTIFICATION_TONE_STYLE[tone]
                    )}
                  >
                    <NotificationIcon tone={tone} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      {!item.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                      {item.body}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                        {formatDateTime(item.created_at)}
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
                </Link>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
