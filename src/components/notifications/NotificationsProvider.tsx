import { ReactNode, useEffect, useState } from "react";

import { resolveAccessToken } from "@/lib/auth/client";
import { getNotifications } from "@/lib/notification/client";
import { MockNotificationItem, NotificationItemData } from "@/types/notification";
import { useSession } from "../session";
import { NotificationsContext } from "./useNotifications";

type NotificationsProviderProps = {
  children: ReactNode;
};

const INITIAL_NOTIFICATIONS: MockNotificationItem[] = [
  {
    id: "feedback-approved",
    title: "피드백이 승인되었어요",
    body: '"프론트엔드 면접 후기"가 공개 상태로 전환되었어요.',
    timeLabel: "방금 전",
    href: "/feedback/mock-approved",
    isRead: false,
    tone: "success",
  },
  {
    id: "admin-comment",
    title: "관리자가 코멘트를 남겼어요",
    body: "면접 질문 정리 부분에 구체적인 예시가 더 있으면 좋겠다고 남겼어요.",
    timeLabel: "12분 전",
    href: "/feedback/mock-comment?commentId=admin",
    isRead: false,
    tone: "info",
  },
  {
    id: "feedback-resubmitted",
    title: "피드백 재승인 요청",
    body: "작성자가 내용을 수정해서 다시 검토가 필요한 상태예요.",
    timeLabel: "1시간 전",
    href: "/admin/feedback",
    isRead: true,
    tone: "warning",
  },
  {
    id: "feedback-rejected",
    title: "피드백이 반려되었어요",
    body: "회사명 공개 여부와 요약 문구를 다시 확인해달라는 피드백이 도착했어요.",
    timeLabel: "어제",
    href: "/feedback/mock-rejected",
    isRead: true,
    tone: "warning",
  },
];

/*
    NotificationsProvider의 역할
    - 알림 상태 관리
    - 초기 fetch
    - unread count 관리
    - Realtime subscribe
    - 새 알림 시 toast
    - markAsRead, markAllAsRead 같은 액션 제공
*/

export default function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<NotificationItemData[]>(INITIAL_NOTIFICATIONS);
  const { session, supabaseBrowserClient } = useSession();

  useEffect(() => {
    console.log({ session });
    if (!session) {
      setNotifications([]);
      return;
    }

    // const controller = new AbortController();
    const getNotificationsLoginUser = async () => {
      try {
        const accessToken = await resolveAccessToken({
          supabaseBrowserClient,
          fallbackAccessToken: session.access_token,
        });
        console.log(accessToken);

        const { data } = await getNotifications(accessToken);

        setNotifications(data);

        // const response = await fetch("/api/notifications", {
        //   method: "GET",
        //   headers: {
        //     Authorization: `Bearer ${accessToken}`,
        //   },
        //   signal: controller.signal,
        // });

        // const result = await response
        //   .json()
        //   .catch(() => ({ data: null, error: "Invalid response" }));

        // if (!response.ok || result.error) {
        //   throw new Error(result.error ?? "Failed to fetch notifications");
        // }
        // console.log({ result });
        // const { data: notificationData } = result;
      } catch (error) {
        // if (controller.signal.aborted) return;
        console.error(error);
        setNotifications([]);
      }
    };
    getNotificationsLoginUser();

    // return () => controller.abort();
  }, [session?.access_token, supabaseBrowserClient]);
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        markAllAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
