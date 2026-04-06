import type { Dispatch, SetStateAction } from "react";
import type { NotificationItemData } from "@/types/notification";

export type SetNotificationsState = Dispatch<SetStateAction<NotificationItemData[]>>;
