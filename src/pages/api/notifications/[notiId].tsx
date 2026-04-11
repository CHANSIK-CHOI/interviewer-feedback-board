import { ApiRequestAuthResult, resolveApiRequestAuth } from "@/lib/auth/request";
import { NOTIFICATION_SELECT_COLUMNS } from "@/lib/notification/server";
import { SupabaseError } from "@/types/common";
import { NotificationItemData } from "@/types/notification";
import { NotificationResponse } from "@/types/response";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NotificationResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  const method = req.method;

  if (method !== "GET" && method !== "PATCH") {
    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).json({ data: null, error: "지원하지 않는 요청 방식입니다." });
  }

  const notiId = req.query.notiId;
  if (typeof notiId !== "string") {
    return res.status(400).json({ data: null, error: "유효하지 않은 알림 ID입니다." });
  }

  const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req);

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "인증이 필요합니다." });
  }
  const { supabaseServerUserClient, userId } = auth.context;

  if (method == "GET") {
    try {
      const { data, error }: { data: NotificationItemData | null; error: SupabaseError } =
        await supabaseServerUserClient
          .from("notifications")
          .select(NOTIFICATION_SELECT_COLUMNS)
          .eq("recipient_user_id", userId)
          .eq("id", notiId)
          .order("created_at", {
            ascending: false,
          })
          .maybeSingle();

      if (error) {
        return res.status(500).json({
          data: null,
          error: error?.message ?? "알림을 불러오지 못했습니다.",
        });
      }

      if (!data) {
        return res.status(404).json({
          data: null,
          error: "해당 알림을 찾을 수 없습니다.",
        });
      }

      return res.status(200).json({ data, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "알림 조회 중 오류가 발생했습니다.";
      return res.status(500).json({ data: null, error: message });
    }
  }

  if (method == "PATCH") {
    try {
      const { count, error: countError } = await supabaseServerUserClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_user_id", userId)
        .eq("id", notiId)
        .eq("is_read", false);

      if (countError || count == null) {
        return res.status(500).json({
          data: null,
          error: countError?.message ?? "읽지 않은 알림 상태를 확인하지 못했습니다.",
        });
      }
      if (count == 0) {
        return res.status(200).json({
          data: null,
          error: null,
        });
      }

      const { data, error } = await supabaseServerUserClient
        .from("notifications")
        .update({ is_read: true })
        .select(NOTIFICATION_SELECT_COLUMNS)
        .eq("recipient_user_id", userId)
        .eq("is_read", false)
        .eq("id", notiId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          data: null,
          error: error?.message ?? "알림을 읽음 처리하지 못했습니다.",
        });
      }
      return res.status(200).json({ data, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "알림 읽음 처리 중 오류가 발생했습니다.";
      return res.status(500).json({ data: null, error: message });
    }
  }
}
