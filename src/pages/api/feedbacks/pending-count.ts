import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestAuthContext } from "@/lib/auth/request";
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
    const auth = await getRequestAuthContext(req, { requireAdmin: true });
    if (auth.error || !auth.context) {
      return res.status(auth.status).json({ data: null, error: auth.error ?? "Unauthorized" });
    }
    const { context } = auth;

    // status = 'pending' | 'revised_pending' 개수만 조회
    const { count, error: countError } = await context.supabaseServer
      .from("feedbacks")
      .select("id", { count: "exact", head: true })
      // 데이터는 가져오지 않고 “개수만” 세기 위한 Supabase 쿼리 옵션
      // select("id"): 카운트 기준 컬럼 지정 (여기선 id)
      // count: "exact": 정확한 개수를 계산
      // head: true: 실제 row 데이터는 내려받지 않음 (헤더만)
      .in("status", ["pending", "revised_pending"]);

    if (countError || count === null) {
      return res
        .status(500)
        .json({ data: null, error: countError?.message ?? "Select failed Pending Data Count" });
    }

    return res.status(200).json({ data: { count }, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ data: null, error: message });
  }
}
