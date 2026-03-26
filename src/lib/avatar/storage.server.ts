import { buildAvatarPath, buildAvatarProxyUrl } from "@/lib/avatar/path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvatarMimeType } from "@/types/avatar";

type ReplaceUserAvatarParams = {
  supabaseServerAdminClient: SupabaseClient;
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
  supabaseServerAdminClient,
  bucket,
  userId,
  fileBuffer,
  contentType,
}: ReplaceUserAvatarParams): Promise<ReplaceUserAvatarResult> {
  const uploadPath = buildAvatarPath(userId);

  const { error: uploadError } = await supabaseServerAdminClient.storage
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
  supabaseServerAdminClient: SupabaseClient;
  bucket: string;
  paths: string[];
};

export async function removeUserAvatar({
  supabaseServerAdminClient,
  bucket,
  paths = [],
}: RemoveUserAvatarParams): Promise<void> {
  const { error: removeAvatarError } = await supabaseServerAdminClient.storage.from(bucket).remove(paths);

  if (removeAvatarError) {
    console.error(removeAvatarError);
    throw new Error(removeAvatarError.message);
  }
}
