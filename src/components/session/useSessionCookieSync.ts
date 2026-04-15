import { useEffect, useRef } from "react";
import type { SessionCookieSyncResponse } from "@/types/response";

const parseSessionCookieSyncResponse = async (
  response: Response
): Promise<SessionCookieSyncResponse> => {
  const payload: unknown = await response.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return { data: null, error: "Invalid response" };
  }

  const { data, error } = payload as { data?: unknown; error?: unknown };
  if (typeof error === "string") {
    return { data: null, error };
  }

  if (error !== null) {
    return { data: null, error: "Invalid response" };
  }

  if (data && typeof data === "object" && (data as { success?: unknown }).success === true) {
    return { data: { success: true }, error: null };
  }

  return { data: null, error: "Invalid response" };
};

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

      const payload: SessionCookieSyncResponse = await parseSessionCookieSyncResponse(response);
      if (payload.error !== null) {
        throw new Error(payload.error ?? "Failed to sync session cookie");
      }

      if (!response.ok) {
        throw new Error("Failed to sync session cookie");
      }

      syncedSessionCookieTokenRef.current = accessToken;
    })().catch((error) => {
      console.error(error);
    });
  }, [accessToken]);
}
