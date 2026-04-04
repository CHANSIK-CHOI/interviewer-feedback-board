import { AVATAR_MAX_FILE_SIZE } from "@/constants";
import { getNormalizedAvatarMimeType } from "@/lib/avatar/mime";
import { AvatarMimeType } from "@/types/avatar";
import { ApiResponse } from "@/types/common";

export const assertValidAvatarFile = (file: File) => {
  const mimeType: AvatarMimeType | null = getNormalizedAvatarMimeType(file.type);
  const isAvatarMimeTypeAllowed = mimeType !== null;

  if (!isAvatarMimeTypeAllowed) {
    throw new Error("프로필 이미지는 JPG/PNG 파일만 업로드할 수 있습니다. (SVG 불가)");
  }

  if (file.size > AVATAR_MAX_FILE_SIZE) {
    throw new Error("프로필 이미지는 2MB 이하만 업로드할 수 있습니다.");
  }
};

export type AvatarUploadResult = {
  avatarUrl: string;
  bucket: string;
  path: string;
};
type AvatarUploadResponse = ApiResponse<AvatarUploadResult>;

export async function uploadAvatarToSupabase(
  file: File,
  accessToken: string
): Promise<AvatarUploadResult> {
  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  assertValidAvatarFile(file);

  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch("/api/avatar/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const result: AvatarUploadResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (result.error !== null) {
    const errorMessage = result.error ?? "아바타 업로드에 실패했습니다.";
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    throw new Error("아바타 업로드에 실패했습니다.");
  }

  return result.data;
}
