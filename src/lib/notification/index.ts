import { NotificationItemData, NotificationRow } from "@/types/notification";
import { NotificationResponse, NotificationsResponse } from "@/types/response";

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
    throw new Error("Missing access token");
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
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "Failed to fetch getRecipientCreateAtUserId");
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
    throw new Error("Missing access token");
  }
  if (!notiId || !String(notiId)) {
    throw new Error("Missin1g notification id");
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
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "Failed to fetch getNotifications");
  }

  return result.data;
};

export const markAllNotificationAsRead = async (accessToken: string | null): Promise<boolean> => {
  if (!accessToken) {
    throw new Error("Missing access token");
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
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "Failed to fetch markAllNotificationAsRead");
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
    throw new Error("Missing access token");
  }

  if (!notiId || !String(notiId)) {
    throw new Error("Missin1g notification id");
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
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || result.error !== null) {
    throw new Error(result.error ?? "Failed to fetch markNotificationAsRead");
  }

  return true;
};
