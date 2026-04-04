import type { NextApiRequest, NextApiResponse } from "next";
import {
  ApiRequestAuthOptions,
  ApiRequestAuthResult,
  resolveApiRequestAuth,
} from "@/lib/auth/request";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { PendingCountResponse } from "@/types/response";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PendingCountResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  try {
    const auth: ApiRequestAuthResult = await resolveApiRequestAuth(req, {
      requireAdmin: true,
    } satisfies ApiRequestAuthOptions);

    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const supabaseServerAdminClient = getSupabaseServerAdminClient();
    if (!supabaseServerAdminClient) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const { count, error: countError } = await supabaseServerAdminClient
      .from("feedbacks")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "revised_pending"]);

    if (countError || typeof count !== "number") {
      const errorMessage = countError?.message?.trim();
      return res.status(500).json({
        data: null,
        error: errorMessage
          ? `Select failed Pending Data Count: ${errorMessage}`
          : "Select failed Pending Data Count",
      });
    }

    return res.status(200).json({ data: { count }, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
