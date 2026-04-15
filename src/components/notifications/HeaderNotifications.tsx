import Link from "next/link";
import { Button } from "@/components/ui";
import NotificationBell from "./NotificationBell";
import NotificationsProvider from "./NotificationsProvider";

export default function HeaderNotifications() {
  return (
    <>
      <NotificationsProvider>
        <NotificationBell />
      </NotificationsProvider>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="hidden h-auto w-fit shrink-0 rounded-full border-transparent bg-transparent px-2 py-2 shadow-none hover:bg-muted/40 dark:border-transparent dark:bg-transparent sm:inline-flex sm:h-7 sm:border-input sm:bg-input/30 sm:px-2.5 sm:py-0 sm:shadow-none sm:hover:bg-input/50"
      >
        <Link href="/notifications">알림함</Link>
      </Button>
    </>
  );
}
