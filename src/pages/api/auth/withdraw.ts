import type { NextApiRequest, NextApiResponse } from "next";
import { buildAvatarPath } from "@/lib/avatar/path";
import { getRequestAuthContext } from "@/lib/auth/request";
import { getSupabaseServer } from "@/lib/supabase/server";
import { removeUserAvatar } from "@/lib/avatar/storage.server";

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET;

type WithdrawResponse = {
  error: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<WithdrawResponse>) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const auth = await getRequestAuthContext(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  });
  if (auth.error || !auth.context) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }

  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  if (!AVATAR_BUCKET) {
    return res.status(500).json({ error: "SUPABASE_AVATAR_BUCKET 환경변수가 필요합니다." });
  }

  const userId = auth.context.userId;
  const avatarPath = buildAvatarPath(userId);

  try {
    await removeUserAvatar({
      supabaseServer,
      bucket: AVATAR_BUCKET,
      paths: [avatarPath],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "아바타 이미지 삭제에 실패했습니다.";
    return res.status(500).json({ error: message });
  }

  const { error: deleteUserError } = await supabaseServer.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return res.status(500).json({ error: "회원 탈퇴 처리에 실패했습니다." });
  }

  return res.status(200).json({ error: null });
}
