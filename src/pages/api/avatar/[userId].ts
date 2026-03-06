import type { NextApiRequest, NextApiResponse } from "next";
import { AVATAR_PLACEHOLDER_SRC, USER_ID_PATTERN } from "@/constants";
import { getNormalizedAvatarMimeType } from "@/lib/avatar/mime";
import { buildAvatarPath } from "@/lib/avatar/path";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/common";
import { AvatarMimeType } from "@/types/avatar";

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET;
type AvatarProxyErrorResponse = ApiResponse<null> | Buffer<ArrayBuffer>;

/*
  USER_ID_PATTERN
  허용 : 영문 대/소문자, 숫자, -, 최소 1글자 이상
  불허: 0글자(빈 문자열), 공백, 한글, /, _, . 같은 다른 문자
*/

const respondWithPlaceholder = (res: NextApiResponse) => {
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  /*
    public
    - 이 응답은 브라우저뿐 아니라 CDN/프록시 같은 공유 캐시에도 저장 가능

    max-age=60
    - 브라우저 캐시는 60초 동안 신선한 응답으로 사용

    s-maxage=300
    - 공유 캐시(CDN 등)는 300초(5분) 동안 사용
    - 보통 공유 캐시에서는 s-maxage가 max-age보다 우선

    브라우저는 1분 캐시, CDN은 5분 캐시한다는 의미
  */
  return res.redirect(302, AVATAR_PLACEHOLDER_SRC);
  /*
    - 클라이언트에게 “이 URL로 다시 요청해”라고 보내는 응답
    - 302는 임시 이동(Temporary Redirect) 상태 코드
    - 여기서는 아바타를 못 찾거나 형식이 문제일 때, 기본 이미지 주소(AVATAR_PLACEHOLDER_SRC)로 보내는 용도야.
  */
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

  const mimeType: AvatarMimeType | null = getNormalizedAvatarMimeType(data.type || "");
  if (!mimeType) {
    return respondWithPlaceholder(res);
  }

  const fileBuffer = Buffer.from(await data.arrayBuffer());
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  return res.status(200).send(fileBuffer);
  /*
    const fileBuffer = Buffer.from(await data.arrayBuffer());
    - Supabase에서 받은 파일(data)을 바이너리 Buffer로 변환

    res.setHeader("X-Content-Type-Options", "nosniff");
    - 브라우저가 MIME 타입을 추측(sniff)하지 못하게 막음
    - 보안상 안전한 헤더

    res.setHeader("Content-Type", mimeType);
    - 이 응답이 image/png 또는 image/jpeg임을 명시

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    - 캐시 정책 설정
    - 브라우저 60초, 공유 캐시(CDN) 300초

    return res.status(200).send(fileBuffer);
    - 상태코드 200(성공)으로 실제 이미지 바이트를 응답 본문에 전송
  */
}
