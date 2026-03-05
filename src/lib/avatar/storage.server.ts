import { buildAvatarPath, buildAvatarProxyUrl } from "@/lib/avatar/path";
import type {
  AvatarRemoveResult,
  RemoveUserAvatarParams,
  ReplaceUserAvatarParams,
  ReplaceUserAvatarResult,
} from "@/types/avatar";

export async function replaceUserAvatar({
  supabaseServer,
  bucket,
  userId,
  fileBuffer,
  contentType,
}: ReplaceUserAvatarParams): Promise<ReplaceUserAvatarResult> {
  const uploadPath = buildAvatarPath(userId);
  // 파일이 실제로 어디에 저장될지는 buildAvatarPath(userId)가 결정해.

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
    avatarUrl: buildAvatarProxyUrl(userId), // 업로드 후 클라이언트에 돌려줄 접근용 URL이야.
  };

  /*
    저장 경로 = buildAvatarPath
    응답 URL = buildAvatarProxyUrl
  */

  /*
    uploadPath = buildAvatarPath(userId)
    - Supabase Storage 내부 파일 경로(키)
    - 예: users/123/avatar
    - 업로드할 때 storage.upload(uploadPath, ...)에 쓰는 값

    buildAvatarProxyUrl(userId)
    - 브라우저가 실제로 요청할 앱 API URL
    - 예: /api/avatar/123?t=...
    - 이 URL은 네 Next API([/api/avatar/[userId]])를 타고, 서버가 권한 확인 후 Supabase에서 파일을 읽어 응답함

    -> fetch로 직접 부르는 게 아니라, <Image src={avatarSrc}> 렌더링 시 브라우저가 GET 요청함.
  */
}

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
