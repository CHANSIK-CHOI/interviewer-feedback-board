import { NextApiRequest, NextApiResponse } from "next";
import type { ApiResponse } from "@/types/common";

type RevalidateResponse = ApiResponse<{ revalidated: true }>;

export default async function handler(req: NextApiRequest, res: NextApiResponse<RevalidateResponse>) {
  const headerSecret = req.headers["x-revalidate-secret"];
  const querySecret = req.query.secret;
  const secretFromHeader = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;
  const secretFromQuery = Array.isArray(querySecret) ? querySecret[0] : querySecret;
  const secret = secretFromHeader ?? secretFromQuery;
  const expectedSecret = process.env.REVALIDATE_SECRET;

  if (req.method !== "POST") {
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  if (!expectedSecret || secret !== expectedSecret) {
    console.log("캐시 무효화 실패");
    return res.status(401).json({ data: null, error: "Invalid secret" });
  }

  try {
    await res.revalidate("/feedback");
    // Next.js의 revalidate 메서드로 /feedback 경로의 ISR 캐시를 무효화함
    // 목록 페이지(/feedback)를 다음 요청 때 다시 생성하게 만드는 트리거
    return res.status(200).json({ data: { revalidated: true }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ data: null, error: `revalidate failed ${message}` });
  }
}
