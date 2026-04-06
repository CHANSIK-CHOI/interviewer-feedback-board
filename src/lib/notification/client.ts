import type { NotificationItemData, NotificationRow } from "@/types/notification";
import type { NotificationResponse, NotificationsResponse } from "@/types/response";

type GetAllNotificationsParams = {
  accessToken: string | null;
  unread?: boolean;
  signal?: AbortSignal;
};

export const getAllNotifications = async ({
  accessToken,
  unread = false,
  signal,
}: GetAllNotificationsParams): Promise<NotificationItemData[]> => {
  if (!accessToken) {
    throw new Error("로그인 정보가 없습니다.");
  }

  let apiRouterLink = "/api/notifications";

  if (unread) {
    apiRouterLink += "?unread=true";
  }

  const response = await fetch(apiRouterLink, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const result: NotificationsResponse = await response
    .json()
    .catch(() => ({ data: null, error: "서버 응답을 확인하지 못했습니다." }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림 목록을 불러오지 못했습니다.");
  }

  return result.data;
};

type GetNotificationsParams = {
  accessToken: string | null;
  notiId: NotificationRow["id"];
  signal?: AbortSignal;
};

export const getNotifications = async ({
  accessToken,
  notiId,
  signal,
}: GetNotificationsParams): Promise<NotificationItemData | null> => {
  if (!accessToken) {
    throw new Error("로그인 정보가 없습니다.");
  }
  if (!notiId || !String(notiId)) {
    throw new Error("알림 ID가 올바르지 않습니다.");
  }

  const response = await fetch(`/api/notifications/${notiId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const result: NotificationResponse = await response
    .json()
    .catch(() => ({ data: null, error: "서버 응답을 확인하지 못했습니다." }));

  if (response.status === 404) {
    throw new Error(result.error ?? "해당 알림을 찾을 수 없습니다.");
  }

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림을 불러오지 못했습니다.");
  }

  return result.data;
};

export const markAllNotificationAsRead = async (accessToken: string | null): Promise<boolean> => {
  if (!accessToken) {
    throw new Error("로그인 정보가 없습니다.");
  }

  const response = await fetch(`/api/notifications`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result: NotificationsResponse = await response
    .json()
    .catch(() => ({ data: null, error: "서버 응답을 확인하지 못했습니다." }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림을 모두 읽음 처리하지 못했습니다.");
  }

  return true;
};

type MarkNotificationAsReadParams = {
  accessToken: string | null;
  notiId: NotificationRow["id"];
};

export const markNotificationAsRead = async ({
  accessToken,
  notiId,
}: MarkNotificationAsReadParams): Promise<boolean> => {
  if (!accessToken) {
    throw new Error("로그인 정보가 없습니다.");
  }

  if (!notiId || !String(notiId)) {
    throw new Error("알림 ID가 올바르지 않습니다.");
  }

  const response = await fetch(`/api/notifications/${notiId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result: NotificationResponse = await response
    .json()
    .catch(() => ({ data: null, error: "서버 응답을 확인하지 못했습니다." }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림을 읽음 처리하지 못했습니다.");
  }

  return true;
};
