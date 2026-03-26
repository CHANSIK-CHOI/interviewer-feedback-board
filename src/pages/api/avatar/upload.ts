import { promises as fs } from "node:fs";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { type File as FormidableFile } from "formidable";
import { AVATAR_MAX_FILE_SIZE } from "@/constants";
import { getNormalizedAvatarMimeType } from "@/lib/avatar/mime";
import { getDetectedAvatarMimeTypeFromBuffer } from "@/lib/avatar/signature";
import { replaceUserAvatar, ReplaceUserAvatarResult } from "@/lib/avatar/storage.server";
import { getRequestAuthContext, RequestAuthOptions, RequestAuthResult } from "@/lib/auth/request";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/common";
import { AvatarMimeType } from "@/types/avatar";

type AvatarUploadData = {
  avatarUrl: string;
  bucket: string;
  path: string;
};

type AvatarUploadResponse = ApiResponse<AvatarUploadData>;

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET;

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseAvatarFile = (req: NextApiRequest): Promise<FormidableFile> =>
  new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      allowEmptyFiles: false,
      maxFiles: 1,
      maxFileSize: AVATAR_MAX_FILE_SIZE,
    });

    form.parse(req, (error, _fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      const avatarInput = files.avatar;
      const avatarFile = Array.isArray(avatarInput) ? avatarInput[0] : avatarInput;
      if (!avatarFile) {
        reject(new Error("업로드할 파일이 없습니다."));
        return;
      }

      resolve(avatarFile);
    });
  });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvatarUploadResponse>
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ data: null, error: "Method Not Allowed" });
  }

  const auth: RequestAuthResult = await getRequestAuthContext(req, {
    missingAccessTokenError: "로그인이 필요합니다.",
    unauthorizedError: "로그인 상태를 확인해주세요.",
  } satisfies RequestAuthOptions);

  if (auth.error || !auth.context) {
    return res
      .status(auth.status)
      .json({ data: null, error: auth.error ?? "로그인 상태를 확인해주세요." });
  }

  if (!AVATAR_BUCKET) {
    return res
      .status(500)
      .json({ data: null, error: "SUPABASE_AVATAR_BUCKET 환경변수가 필요합니다." });
  }

  const supabaseServerAdminClient = getSupabaseServerAdminClient();
  if (!supabaseServerAdminClient) {
    return res
      .status(500)
      .json({ data: null, error: "서버 Supabase 클라이언트를 초기화하지 못했습니다." });
  }

  let avatarFile: FormidableFile;
  try {
    avatarFile = await parseAvatarFile(req);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "httpCode" in error &&
      typeof error.httpCode === "number" &&
      error.httpCode === 413
    ) {
      return res
        .status(413)
        .json({ data: null, error: "프로필 이미지는 2MB 이하만 업로드할 수 있습니다." });
    }

    return res
      .status(400)
      .json({ data: null, error: "이미지 파일 업로드 형식이 올바르지 않습니다." });
  }

  if (avatarFile.size > AVATAR_MAX_FILE_SIZE) {
    return res
      .status(413)
      .json({ data: null, error: "프로필 이미지는 2MB 이하만 업로드할 수 있습니다." });
  }

  if (!avatarFile.mimetype) {
    return res.status(400).json({
      data: null,
      error: "프로필 이미지는 JPG/PNG 파일만 업로드할 수 있습니다. (SVG 불가)",
    });
  }

  try {
    const normalizedMimeType: AvatarMimeType | null = getNormalizedAvatarMimeType(
      avatarFile.mimetype
    );
    if (!normalizedMimeType) {
      return res.status(400).json({
        data: null,
        error: "프로필 이미지는 JPG/PNG 파일만 업로드할 수 있습니다. (SVG 불가)",
      });
    }

    const fileBuffer = await fs.readFile(avatarFile.filepath);
    const detectedMimeType: AvatarMimeType | null = getDetectedAvatarMimeTypeFromBuffer(fileBuffer);
    if (!detectedMimeType || detectedMimeType !== normalizedMimeType) {
      return res.status(400).json({
        data: null,
        error: "파일 형식이 올바르지 않습니다. JPG/PNG만 업로드할 수 있습니다.",
      });
    }

    const replaceUserAvatarResult: ReplaceUserAvatarResult = await replaceUserAvatar({
      supabaseServerAdminClient,
      bucket: AVATAR_BUCKET,
      userId: auth.context.userId,
      fileBuffer,
      contentType: detectedMimeType,
    });

    return res.status(200).json({ data: replaceUserAvatarResult, error: null });
  } catch (error) {
    console.error("Avatar upload API failed", error);
    const message = error instanceof Error ? error.message : "아바타 업로드에 실패했습니다.";
    return res.status(500).json({ data: null, error: message });
  } finally {
    await fs.unlink(avatarFile.filepath).catch(() => undefined);
  }
}
