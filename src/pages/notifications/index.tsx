import { PageMeta } from "@/components/common";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/feedback/presentation";
import { getAllNotifications } from "@/lib/notification";
import { cn } from "@/lib/shared/cn";
import { NotificationItemData } from "@/types/notification";
import { Bell, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  NotificationIcon,
  NOTIFICATION_TONE_BY_TYPE,
  NOTIFICATION_TONE_STYLE,
  NOTIFICATION_TYPE_LABEL,
} from "@/components/notifications/notification-presentation";

type NotificationFilter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { session, isInitSessionComplete, getAccessTokenOrThrow } = useSession();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitSessionComplete) return;

    if (!session) {
      setNotifications([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const accessToken = await getAccessTokenOrThrow();
        const data = await getAllNotifications({
          accessToken,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setNotifications(data);
      } catch (fetchError) {
        if (controller.signal.aborted) return;

        const message =
          fetchError instanceof Error ? fetchError.message : "알림을 불러오지 못했습니다.";
        setError(message);
        setNotifications([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [session, isInitSessionComplete, getAccessTokenOrThrow]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );
  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.is_read);
    }

    if (filter === "read") {
      return notifications.filter((item) => item.is_read);
    }

    return notifications;
  }, [filter, notifications]);

  const filterOptions: { value: NotificationFilter; label: string; count: number }[] = [
    { value: "all", label: "전체", count: notifications.length },
    { value: "unread", label: "안읽음", count: unreadCount },
    { value: "read", label: "읽음", count: readCount },
  ];

  return (
    <>
      <PageMeta
        title="알림함"
        ogTitle="알림함"
        description="피드백 승인 상태, 코멘트, 답글 알림을 한 곳에서 확인할 수 있는 페이지입니다."
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notifications
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">알림함</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                승인 상태 변경, 코멘트, 답글 흐름을 읽음 여부와 함께 확인할 수 있어요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/feedback">피드백 보드로 이동</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              전체
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {notifications.length}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              안읽음
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {unreadCount}
            </strong>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              읽음
            </p>
            <strong className="mt-2 block text-2xl font-semibold text-foreground">
              {readCount}
            </strong>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const isActive = filter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/70 bg-background text-foreground hover:bg-muted/70 dark:border-white/10 dark:bg-neutral-950"
                  )}
                >
                  <span>{option.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      isActive
                        ? "bg-background/15 text-background"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4">
          {isLoading && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-background/80 p-6 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">알림을 불러오는 중입니다.</p>
            </div>
          )}

          {!isLoading && !session && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-background/80 p-6 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  로그인 후 알림을 확인할 수 있어요
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  세션이 확인되면 여기서 읽음 상태까지 함께 볼 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {!isLoading && session && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-700 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
              {error}
            </div>
          )}

          {!isLoading && session && !error && filteredNotifications.length === 0 && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-background/80 p-6 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {filter === "all"
                    ? "아직 표시할 알림이 없어요"
                    : `${filter === "unread" ? "안읽은" : "읽은"} 알림이 없어요`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  피드백 승인 상태나 코멘트 흐름이 생기면 이곳에 쌓입니다.
                </p>
              </div>
            </div>
          )}

          {!isLoading &&
            session &&
            !error &&
            filteredNotifications.map((item) => {
              const tone = NOTIFICATION_TONE_BY_TYPE[item.type];

              return (
                <Link
                  href={item.link}
                  key={item.id}
                  className={cn(
                    "group flex items-start gap-4 rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-border hover:bg-background dark:border-white/10 dark:bg-neutral-900/70 dark:hover:border-white/20",
                    !item.is_read && "ring-1 ring-sky-400/40"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      NOTIFICATION_TONE_STYLE[tone]
                    )}
                  >
                    <NotificationIcon tone={tone} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                          item.is_read
                            ? "bg-muted text-muted-foreground"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                        )}
                      >
                        {item.is_read ? "읽음" : "안읽음"}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {NOTIFICATION_TYPE_LABEL[item.type]}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(item.created_at)}</span>
                      <span className="font-medium text-foreground/70 group-hover:text-foreground">
                        관련 화면으로 이동
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
        </section>
      </div>
    </>
  );
}
