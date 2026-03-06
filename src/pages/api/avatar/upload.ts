import { promises as fs } from "node:fs";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { type File as FormidableFile } from "formidable";
import { AVATAR_MAX_FILE_SIZE } from "@/constants";
import { getNormalizedAvatarMimeType } from "@/lib/avatar/mime";
import { getDetectedAvatarMimeTypeFromBuffer } from "@/lib/avatar/signature";
import { replaceUserAvatar, ReplaceUserAvatarResult } from "@/lib/avatar/storage.server";
import { getRequestAuthContext, RequestAuthOptions, RequestAuthResult } from "@/lib/auth/request";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/common";
import { AvatarMimeType } from "@/types/avatar";

type AvatarUploadData = {
  avatarUrl: string;
  bucket: string;
  path: string;
};
type AvatarUploadResponse = ApiResponse<AvatarUploadData>;

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET;

/*
  multipart/form-data
  - HTML form이나 FormData로 파일 + 텍스트를 같이 보낼 때 쓰는 인코딩 방식이야.
  - 본문이 boundary 기준으로 여러 “파트”로 나뉨.
  - 각 파트는 헤더 + 데이터 구조.
  - 예:
    파트 1: name="avatar" + 바이너리 파일
    파트 2: name="nickname" + 문자열
  - 브라우저가 FormData를 보내면 Content-Type: multipart/form-data; boundary=...를 자동으로 붙여줘.
*/
/*
  왜 bodyParser: false를 쓰는가
  - Next API Route 기본 bodyParser는 JSON/urlencoded 위주로 파싱해 req.body를 만들어줌.
  - 파일 업로드(multipart)는 별도 파서(formidable, multer)가 필요.
  - 중요한 점: 기본 parser가 먼저 body를 읽어버리면 스트림이 소모돼서 formidable.parse(req)가 제대로 못 읽음.
  - 그래서 bodyParser: false로 기본 파서를 끄고, formidable이 직접 req를 읽게 하는 거야.
*/
/*
  req가 req.body 자체냐?
  - 아니야. 완전히 다름.
  - req: 요청 전체 객체(method, headers, URL, body 스트림 포함)
  - req.body: 파싱된 바디 결과물(기본 parser가 켜져 있을 때)
  - bodyParser: false면 보통 req.body를 기대하면 안 되고, req 스트림을 직접 파싱해야 해.
*/
/*
  .parse(req, (error, _fields, files) => ...) 의미
  - formidable.parse가 req 스트림에서 multipart를 읽고 분해함.
  - error: 파싱 에러
  - _fields: 텍스트 필드들(여기선 안 써서 _ prefix)
  - files: 업로드 파일들 (files.avatar 등)
*/

// FormData 전송 -> 서버에서 req 수신 -> formidable.parse(req)로 fields/files 추출.

/*
  1. HTTP 기본
  - HTTP request/response
  - headers, Content-Type, Authorization
  - request body와 stream

  2. 브라우저 전송 API
  - FormData
  - fetch with file upload
  - Blob, File

  3. 멀티파트 포맷
  - multipart/form-data
  - boundary, part, Content-Disposition

  4. Node.js 서버 입력 처리
  - IncomingMessage(req 스트림)
  - buffer vs stream
  - 파일 업로드 파서(formidable, multer, busboy)

  5. Next.js API Route/Route Handler
  - pages/api의 config.api.bodyParser
  - App Router에서의 업로드 처리 차이(request.formData())

  6. 보안
  - MIME 검증/시그니처 검증
  - 파일 크기 제한
  - 인증 토큰 처리
  - 업로드 경로/권한 제어
*/
export const config = {
  api: {
    bodyParser: false,
  },
};

/*
  parseAvatarFile(req)의 resolve(avatarFile)
  - 여기서 받는 건 파일 자체 바이트가 아니라 FormidableFile 객체야.
  - 안에는 filepath, size, mimetype 같은 메타정보만 있어.
*/
/*
  fs.readFile(avatarFile.filepath)
  - 이 단계에서 실제 파일 바이트를 Buffer로 읽어.
  - 이 바이트가 있어야 시그니처 검사(PNG/JPEG 매직바이트 확인)
*/
/*
  - formidable은 기본적으로 업로드를 임시 디스크 파일로 받아서 메모리 폭주를 막고,
  - 파싱(요청 분해)과 내용 검증(바이트 검사)을 분리해 처리하기 좋기 때문이야.

  즉, resolve된 파일과 디스크 파일은 중복이 아니라 파일 정보 객체 vs 실제 파일 데이터 차이야.
*/
const parseAvatarFile = (req: NextApiRequest): Promise<FormidableFile> =>
  new Promise((resolve, reject) => {
    /*
      formidable : 파일 업로드(multipart/form-data)를 파싱하는 라이브러리 (업로드 요청을 해체해주는 라이브러리)
      >> formidable(...) : 파서 객체(IncomingForm)를 만드는 팩토리 함수 (해체기(파서) 생성 함수)

      formidable 옵션 설정
      - multiples: false 파일 여러 개 금지
      - allowEmptyFiles: false 빈 파일 금지
      - maxFiles: 1 파일 1개만 허용
      - maxFileSize 최대 용량 제한
    */
    // formidable이 req의 multipart 스트림을 읽으면서 파일 파트를 OS tmp 디렉토리에 써.
    const form = formidable({
      multiples: false,
      allowEmptyFiles: false,
      maxFiles: 1,
      maxFileSize: AVATAR_MAX_FILE_SIZE,
    });

    // 서버 디스크에 임시 저장된 시점이다.
    form.parse(req, (error, _fields, files) => {
      /*
        텍스트 필드(fields)
        파일 메타데이터(files) 를 분리해 줘.
        파일은 기본적으로 임시 디스크에 저장되고, files.avatar.filepath로 경로를 받게 돼.
      */
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
      // resolve(avatarFile) 시점에는 이미 임시 파일이 만들어진 상태야.
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

  const supabaseServer = getSupabaseServer();
  if (!supabaseServer) {
    return res
      .status(500)
      .json({ data: null, error: "서버 Supabase 클라이언트를 초기화하지 못했습니다." });
  }

  let avatarFile: FormidableFile;
  /*
    왜 avatarFile 자체를 바로 Supabase에 안 올리고 fs.readFile(filepath)를 쓰냐

    - avatarFile은 “파일 바이트”가 아니라 메타데이터 객체야.
      예: size, mimetype, filepath 등
      * avatarFile = 메타데이터 객체
      * avatarFile.filepath = 메타데이터 중 하나인 “임시 파일 경로 문자열”
      * “실제 파일 바이트가 저장된 위치(주소)”를 가리키는 값
    - 실제 바이트는 filepath에 있는 임시 파일을 읽어야 얻을 수 있어.
    - 그리고 지금 로직은 바이트 기반 검증(시그니처 검사)을 해야 하니까 Buffer가 필요해:
      avatarFile.mimetype(신고값) vs getDetectedAvatarMimeTypeFromBuffer(fileBuffer)(실제값) 비교

    추가로
    - 요청 스트림(req)은 한 번 읽히면 끝이라, formidable이 읽은 뒤 같은 원본 스트림을 다시 “그대로 업로드”하기도 어렵다.
    - 마지막에 finally에서 fs.unlink(avatarFile.filepath)로 임시 파일 정리까지 하고 있어.

    흐름은:
    1. formidable이 업로드 스트림을 임시 파일로 저장
    2. avatarFile.filepath에 그 저장 위치를 넣어줌
    3. fs.readFile(avatarFile.filepath)로 그 경로의 파일 내용을 읽어서
    4. fileBuffer(실제 바이트 데이터)를 얻음

    >> 메타데이터의 경로를 이용해 실제 임시 파일을 읽는다
  */
  try {
    avatarFile = await parseAvatarFile(req);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "httpCode" in error && // error 객체 안에 httpCode 속성이 있는지 확인
      typeof error.httpCode === "number" &&
      error.httpCode === 413 // 그 숫자가 정확히 413인지 확인 (Payload Too Large)
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
    // avatarFile.filepath : 서버 디스크에 임시 저장된 업로드 파일
    // 메모리로 읽어서 Buffer(바이너리 데이터)로 만드는 코드
    // 임시 저장은 form.parse(req, ...) 안에서 일어나.
    const detectedMimeType: AvatarMimeType | null = getDetectedAvatarMimeTypeFromBuffer(fileBuffer);
    if (!detectedMimeType || detectedMimeType !== normalizedMimeType) {
      return res.status(400).json({
        data: null,
        error: "파일 형식이 올바르지 않습니다. JPG/PNG만 업로드할 수 있습니다.",
      });
    }

    const replaceUserAvatarResult: ReplaceUserAvatarResult = await replaceUserAvatar({
      supabaseServer,
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
