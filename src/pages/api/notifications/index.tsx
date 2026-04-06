import { ApiRequestAuthResult, resolveApiRequestAuth } from "@/lib/auth/request";
import { toStrictBoolean } from "@/lib/shared/normalize";
import { SupabaseError } from "@/types/common";
import { NotificationItemData } from "@/types/notification";
import { NotificationsResponse } from "@/types/response";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NotificationsResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  const method = req.method;

  if (method !== "GET" && method !== "PATCH") {
    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).json({ data: null, error: "지원하지 않는 요청 방식입니다." });
  }

  const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req);

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "인증이 필요합니다." });
  }
  const { supabaseServerUserClient, userId } = auth.context;

  if (method == "GET") {
    const unread = req.query.unread;
    const isUnRead = toStrictBoolean(unread);

    try {
      let query = supabaseServerUserClient
        .from("notifications")
        .select("id, type, title, body, link, is_read, read_at, created_at")
        .eq("recipient_user_id", userId)
        .order("created_at", {
          ascending: false,
        });

      if (isUnRead) {
        query = query.eq("is_read", false);
      }

      const { data, error }: { data: NotificationItemData[] | null; error: SupabaseError } =
        await query;

      if (error || !data) {
        return res.status(500).json({
          data: null,
          error: error?.message ?? "알림 목록을 불러오지 못했습니다.",
        });
      }

      return res.status(200).json({ data, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "알림 목록 조회 중 오류가 발생했습니다.";
      return res.status(500).json({ data: null, error: message });
    }
  }

  if (method == "PATCH") {
    try {
      const { count, error: countError } = await supabaseServerUserClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_user_id", userId)
        .eq("is_read", false);

      if (countError || count == null) {
        return res.status(500).json({
          data: null,
          error: countError?.message ?? "읽지 않은 알림 수를 확인하지 못했습니다.",
        });
      }
      if (count == 0) {
        return res.status(200).json({
          data: [],
          error: null,
        });
      }

      const { data, error } = await supabaseServerUserClient
        .from("notifications")
        .update({ is_read: true })
        .select("id, type, title, body, link, is_read, read_at, created_at")
        .eq("recipient_user_id", userId)
        .eq("is_read", false);

      if (error || !data) {
        return res.status(500).json({
          data: null,
          error: error?.message ?? "알림을 모두 읽음 처리하지 못했습니다.",
        });
      }
      return res.status(200).json({ data, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "알림 읽음 처리 중 오류가 발생했습니다.";
      return res.status(500).json({ data: null, error: message });
    }
  }
}
