import { buildAvatarPath, buildAvatarProxyUrl } from "@/lib/avatar/path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvatarMimeType } from "@/types/avatar";

type ReplaceUserAvatarParams = {
  supabaseServer: SupabaseClient;
  bucket: string;
  userId: string;
  fileBuffer: Buffer;
  contentType: AvatarMimeType;
};

export type ReplaceUserAvatarResult = {
  avatarUrl: string;
  bucket: string;
  path: string;
};

export async function replaceUserAvatar({
  supabaseServer,
  bucket,
  userId,
  fileBuffer,
  contentType,
}: ReplaceUserAvatarParams): Promise<ReplaceUserAvatarResult> {
  const uploadPath = buildAvatarPath(userId);

  const { error: uploadError } = await supabaseServer.storage
    .from(bucket)
    .upload(uploadPath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error(uploadError);
    throw new Error("새 아바타 업로드에 실패했습니다.");
  }

  return {
    bucket,
    path: uploadPath,
    avatarUrl: buildAvatarProxyUrl(userId),
  };
}

type RemoveUserAvatarParams = {
  supabaseServer: SupabaseClient;
  bucket: string;
  paths: string[];
};

export async function removeUserAvatar({
  supabaseServer,
  bucket,
  paths = [],
}: RemoveUserAvatarParams): Promise<void> {
  const { error: removeAvatarError } = await supabaseServer.storage.from(bucket).remove(paths);

  if (removeAvatarError) {
    console.error(removeAvatarError);
    throw new Error(removeAvatarError.message);
  }
}
