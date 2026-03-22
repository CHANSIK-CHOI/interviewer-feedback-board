import type { NextApiRequest, NextApiResponse } from "next";
import { AVATAR_PLACEHOLDER_SRC, USER_ID_PATTERN } from "@/constants";
import { getNormalizedAvatarMimeType } from "@/lib/avatar/mime";
import { buildAvatarPath } from "@/lib/avatar/path";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/common";
import { AvatarMimeType } from "@/types/avatar";

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET;
type AvatarProxyErrorResponse = ApiResponse<null> | Buffer<ArrayBuffer>;

const respondWithPlaceholder = (res: NextApiResponse) => {
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  return res.redirect(302, AVATAR_PLACEHOLDER_SRC);
};

const respondWithError = (
  res: NextApiResponse<AvatarProxyErrorResponse>,
  status: number,
  message: string
) => {
  return res.status(status).json({ data: null, error: message });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvatarProxyErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return respondWithError(res, 405, "Method Not Allowed");
  }

  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!userId || !USER_ID_PATTERN.test(userId)) {
    return respondWithError(res, 400, "Invalid user id");
  }

  if (!AVATAR_BUCKET) {
    return respondWithError(res, 500, "SUPABASE_AVATAR_BUCKET 환경변수가 필요합니다.");
  }

  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    return respondWithError(res, 500, "서버 Supabase 클라이언트를 초기화하지 못했습니다.");
  }

  const { data, error } = await supabaseServer.storage
    .from(AVATAR_BUCKET)
    .download(buildAvatarPath(userId));
  if (error || !data) {
    return respondWithPlaceholder(res);
  }

  const mimeType: AvatarMimeType | null = getNormalizedAvatarMimeType(data.type);
  if (!mimeType) {
    return respondWithPlaceholder(res);
  }

  const fileBuffer = Buffer.from(await data.arrayBuffer());
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  return res.status(200).send(fileBuffer);
}
