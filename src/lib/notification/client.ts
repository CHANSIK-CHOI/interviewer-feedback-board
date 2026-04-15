import type { NotificationItemData, NotificationRow } from "@/types/notification";
import type { NotificationResponse, NotificationsResponse } from "@/types/response";
import { parseApiResponse } from "@/lib/api/response";
import { notificationItemDataOrNullSchema, notificationItemDataSchema } from "@/lib/api/schemas";

type GetAllNotificationsParams = {
  accessToken: string | null;
  unread?: boolean;
  signal?: AbortSignal;
  limit?: number;
};

export const getAllNotifications = async ({
  accessToken,
  unread = false,
  signal,
  limit = 0,
}: GetAllNotificationsParams): Promise<NotificationItemData[]> => {
  if (!accessToken) {
    throw new Error("로그인 정보가 없습니다.");
  }
  const params = new URLSearchParams();

  if (unread) {
    params.set("unread", "true");
  }

  if (limit > 0) {
    params.set("limit", String(limit));
  }

  const queryString = params.toString();
  const apiRouterLink = queryString ? `/api/notifications?${queryString}` : "/api/notifications";

  const response = await fetch(apiRouterLink, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const result: NotificationsResponse = await parseApiResponse(
    response,
    notificationItemDataSchema.array(),
    "서버 응답을 확인하지 못했습니다."
  );

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림 목록을 불러오지 못했습니다.");
  }

  return result.data;
};

type GetNotificationParams = {
  accessToken: string | null;
  notiId: NotificationRow["id"];
  signal?: AbortSignal;
};

export const getNotification = async ({
  accessToken,
  notiId,
  signal,
}: GetNotificationParams): Promise<NotificationItemData | null> => {
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

  const result: NotificationResponse = await parseApiResponse(
    response,
    notificationItemDataOrNullSchema,
    "서버 응답을 확인하지 못했습니다."
  );

  if (response.status === 404) {
    throw new Error(result.error ?? "해당 알림을 찾을 수 없습니다.");
  }

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림을 불러오지 못했습니다.");
  }

  return result.data;
};

// 전체 알림 읽음 상태로 변경
type MarkAllNotificationAsReadParams = {
  accessToken: string | null;
};

export const markAllNotificationAsRead = async ({
  accessToken,
}: MarkAllNotificationAsReadParams): Promise<boolean> => {
  if (!accessToken) {
    throw new Error("로그인 정보가 없습니다.");
  }

  const response = await fetch("/api/notifications/read-all", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result: NotificationsResponse = await parseApiResponse(
    response,
    notificationItemDataSchema.array(),
    "서버 응답을 확인하지 못했습니다."
  );

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림을 모두 읽음 처리하지 못했습니다.\n다시 시도해주세요.");
  }

  return true;
};

// 단건 알림 읽음 상태로 변경
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

  const result: NotificationResponse = await parseApiResponse(
    response,
    notificationItemDataOrNullSchema,
    "서버 응답을 확인하지 못했습니다."
  );

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림을 읽음 처리하지 못했습니다.\n다시 시도해주세요.");
  }

  return true;
};

// 여러 알림 읽음 상태로 변경
type MarkNotificationsAsReadParams = {
  accessToken: string | null;
  notiIds: NotificationRow["id"][];
};

export const markNotificationsAsRead = async ({
  accessToken,
  notiIds = [],
}: MarkNotificationsAsReadParams) => {
  if (!accessToken) {
    throw new Error("로그인 정보가 없습니다.");
  }

  if (!Array.isArray(notiIds) || notiIds.length <= 0) return;

  const response = await fetch(`/api/notifications/read`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ids: notiIds,
    }),
  });

  const result: NotificationsResponse = await parseApiResponse(
    response,
    notificationItemDataSchema.array(),
    "서버 응답을 확인하지 못했습니다."
  );

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "알림을 읽음 처리하지 못했습니다.\n다시 시도해주세요.");
  }

  return true;
};
