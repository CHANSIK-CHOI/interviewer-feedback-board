import { ApiRequestAuthResult, resolveApiRequestAuth } from "@/lib/auth/request";
import { listNotifications } from "@/lib/notification/server";
import { toStrictBoolean, toStrictNumber } from "@/lib/shared/normalize";
import { NotificationsResponse } from "@/types/response";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NotificationsResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  const method = req.method;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ data: null, error: "지원하지 않는 요청 방식입니다." });
  }

  const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req);

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "인증이 필요합니다." });
  }
  const { supabaseServerUserClient, userId } = auth.context;

  const unread = req.query.unread;
  const isUnRead = toStrictBoolean(unread);
  const limit = req.query.limit;
  const limitValue = toStrictNumber(limit);

  try {
    const { data, error } = await listNotifications({
      supabaseClient: supabaseServerUserClient,
      userId,
      unread: isUnRead ?? false,
      limit: limitValue,
    });

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
