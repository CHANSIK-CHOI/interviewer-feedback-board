import { PageMeta } from "@/components/common";
import { useSession } from "@/components/session";
import { Button, useAlert } from "@/components/ui";
import { AuthContextResult, resolveAuthContextByAccessToken } from "@/lib/auth/server";
import { formatDateTime } from "@/lib/feedback/presentation";
import {
  getAllNotifications,
  markAllNotificationAsRead,
  markNotificationAsRead,
} from "@/lib/notification";
import { useNotificationRealtime } from "@/components/notifications/useNotificationRealtime";
import { cn } from "@/lib/shared/cn";
import { SupabaseError } from "@/types/common";
import { NotificationItemData } from "@/types/notification";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import {
  NotificationIcon,
  NOTIFICATION_TONE_BY_TYPE,
  NOTIFICATION_TONE_STYLE,
  NOTIFICATION_TYPE_LABEL,
} from "@/components/notifications/presentation";

type NotificationFilter = "all" | "unread" | "read";

type NotificationsPageProps = {
  initialNotifications: NotificationItemData[];
  initialAlertMessage: string | null;
  isSsrAuthenticated: boolean;
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const accessToken = context.req.cookies["sb-access-token"];

  if (!accessToken) {
    return {
      props: {
        initialNotifications: [],
        initialAlertMessage: null,
        isSsrAuthenticated: false,
      } satisfies NotificationsPageProps,
    };
  }

  const authResult: AuthContextResult = await resolveAuthContextByAccessToken(accessToken);
  const { context: authContext, error: authError } = authResult;

  if (authError || !authContext) {
    return {
      props: {
        initialNotifications: [],
        initialAlertMessage: null,
        isSsrAuthenticated: false,
      } satisfies NotificationsPageProps,
    };
  }

  const { data, error }: { data: NotificationItemData[] | null; error: SupabaseError } =
    await authContext.supabaseServerUserClient
      .from("notifications")
      .select("id, type, title, body, link, is_read, read_at, created_at")
      .eq("recipient_user_id", authContext.userId)
      .order("created_at", {
        ascending: false,
      });

  return {
    props: {
      initialNotifications: data ?? [],
      initialAlertMessage: error?.message ?? null,
      isSsrAuthenticated: true,
    } satisfies NotificationsPageProps,
  };
};

export default function NotificationsPage({
  initialNotifications,
  initialAlertMessage,
  isSsrAuthenticated,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const isAlertedRef = useRef(false);
  const router = useRouter();
  const { session, isInitSessionComplete, getAccessTokenOrThrow, supabaseBrowserClient } =
    useSession();
  const { openAlert } = useAlert();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<NotificationItemData[]>(initialNotifications);
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);

  useEffect(() => {
    if (initialAlertMessage && !isAlertedRef.current) {
      openAlert({
        description: initialAlertMessage,
      });
      isAlertedRef.current = true;
    }
  }, [initialAlertMessage, openAlert]);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    if (!isInitSessionComplete || session) return;

    setNotifications([]);
  }, [isInitSessionComplete, session]);

  useEffect(() => {
    if (!isInitSessionComplete || !session) return;
    if (isSsrAuthenticated && initialAlertMessage === null) return;

    const controller = new AbortController();

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
        openAlert({
          description: message,
        });
        setNotifications([]);
      }
    })();

    return () => controller.abort();
  }, [
    getAccessTokenOrThrow,
    initialAlertMessage,
    isInitSessionComplete,
    isSsrAuthenticated,
    openAlert,
    session,
  ]);

  const handleRealtimeInsert = useCallback((next: NotificationItemData) => {
    setNotifications((prev) => {
      if (prev.some((item) => item.id === next.id)) {
        return prev;
      }

      return [next, ...prev];
    });
  }, []);

  const handleRealtimeUpdate = useCallback((next: NotificationItemData) => {
    setNotifications((prev) => {
      if (prev.some((item) => item.id === next.id)) {
        return prev.map((item) => (item.id === next.id ? next : item));
      }

      return [next, ...prev];
    });
  }, []);

  useNotificationRealtime({
    session,
    supabaseBrowserClient,
    channelNamePrefix: "notifications-page",
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
  });

  const isSignedIn = Boolean(session) || isSsrAuthenticated;

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

  const handleMarkAllAsRead = async () => {
    if (!session || unreadCount === 0 || isMarkingAllAsRead) return;

    setIsMarkingAllAsRead(true);

    try {
      const accessToken = await getAccessTokenOrThrow();
      await markAllNotificationAsRead(accessToken);

      setNotifications((prev) =>
        prev.map((item) =>
          item.is_read
            ? item
            : {
                ...item,
                is_read: true,
                read_at: new Date().toISOString(),
              }
        )
      );
    } catch (markAllError) {
      console.error(markAllError);
      openAlert({
        description: "알림을 모두 읽음 처리하지 못했습니다.\n다시 시도해주세요.",
      });
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  const handleClickNotificationItemLink = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    item: NotificationItemData
  ) => {
    event.preventDefault();

    if (!session || item.is_read) {
      await router.push(item.link);
      return;
    }

    try {
      const accessToken = await getAccessTokenOrThrow();
      await markNotificationAsRead({ accessToken, notiId: item.id });
      setNotifications((prev) =>
        prev.map((prevItem) =>
          prevItem.id === item.id
            ? {
                ...prevItem,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : prevItem
        )
      );
    } catch (error) {
      console.error(error);
      openAlert({
        description: "알림을 읽음 처리하지 못했습니다.\n다시 시도해주세요.",
      });
    } finally {
      await router.push(item.link);
    }
  };

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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleMarkAllAsRead();
                }}
                disabled={!session || unreadCount === 0 || isMarkingAllAsRead}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                모두 읽음
              </Button>
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
          {!isSignedIn && (
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

          {isSignedIn && filteredNotifications.length === 0 && (
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

          {isSignedIn &&
            filteredNotifications.map((item) => {
              const tone = NOTIFICATION_TONE_BY_TYPE[item.type];

              return (
                <Link
                  href={item.link}
                  key={item.id}
                  onClick={(event) => {
                    void handleClickNotificationItemLink(event, item);
                  }}
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
