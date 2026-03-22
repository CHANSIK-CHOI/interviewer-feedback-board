import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext, RequestAuthOptions, RequestAuthResult } from "@/lib/auth/request";
import { resolveSupabaseErrorMessage } from "@/lib/supabase/error";
import { getSupabaseServer } from "@/lib/supabase/server";
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
    const auth: RequestAuthResult = await getRequestAuthContext(req, {
      requireAdmin: true,
    } satisfies RequestAuthOptions);

    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const supabaseServer = getSupabaseServer();
    if (!supabaseServer) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const { count, error: countError } = await supabaseServer
      .from("feedbacks")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "revised_pending"]);

    if (countError || count === null) {
      return res.status(500).json({
        data: null,
        error: resolveSupabaseErrorMessage(countError, "Select failed Pending Data Count"),
      });
    }

    return res.status(200).json({ data: { count }, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
