import { ApiRequestAuthResult, resolveApiRequestAuth } from "@/lib/auth/request";
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
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const notiId = req.query.notiId;
  if (typeof notiId !== "string") {
    return res.status(400).json({ data: null, error: "Invalid notification id" });
  }

  const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req);

  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
  }
  const { supabaseServerUserClient, userId } = auth.context;

  if (method == "GET") {
    try {
      const { data, error }: { data: NotificationItemData | null; error: SupabaseError } =
        await supabaseServerUserClient
          .from("notifications")
          .select("id, type, title, body, link, is_read, read_at, created_at")
          .eq("recipient_user_id", userId)
          .eq("id", notiId)
          .order("created_at", {
            ascending: false,
          })
          .maybeSingle();

      if (error) {
        return res.status(500).json({
          data: null,
          error: error?.message ?? "Select failed notifications Data",
        });
      }

      return res.status(200).json({ data, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
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
          error: countError?.message ?? "Select failed notifications Data",
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
        .select("id, type, title, body, link, is_read, read_at, created_at")
        .eq("recipient_user_id", userId)
        .eq("is_read", false)
        .eq("id", notiId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          data: null,
          error: error?.message ?? "Update failed notifications Data",
        });
      }
      return res.status(200).json({ data, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return res.status(500).json({ data: null, error: message });
    }
  }
}
