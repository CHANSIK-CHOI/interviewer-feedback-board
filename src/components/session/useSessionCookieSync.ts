import { useEffect, useRef } from "react";
import { SessionCookieSyncResponse } from "@/types/response";

export function useSessionCookieSync(accessToken: string | null) {
  const syncedSessionCookieTokenRef = useRef<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!accessToken) {
        syncedSessionCookieTokenRef.current = null;
        await fetch("/api/auth/session", {
          method: "DELETE",
        });
        return;
      }

      if (syncedSessionCookieTokenRef.current === accessToken) {
        return;
      }

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload: SessionCookieSyncResponse = await response
        .json()
        .catch(() => ({ data: null, error: "Invalid response" }));
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to sync session cookie");
      }

      syncedSessionCookieTokenRef.current = accessToken;
    })().catch((error) => {
      console.error(error);
    });
  }, [accessToken]);
}
