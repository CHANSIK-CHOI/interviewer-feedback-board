import { AVATAR_PLACEHOLDER_SRC } from "./avatar";
import type { FeedbackFormValues } from "@/types/forms";

export const APPROVED_PUBLIC_COLUMNS =
  "id, author_id, display_name, company_name, is_company_public, avatar_url, summary, strengths, questions, suggestions, rating, tags, status, is_public, revision_count, created_at, updated_at, reviewed_at, reviewed_by";

export const PREVIEWCOLUMN =
  "id, author_id, display_name, company_name, is_company_public, avatar_url, status, is_public, revision_count, created_at, updated_at, reviewed_at, reviewed_by";

export const NEW_FEEDBACK_DEFAULT_VALUES: FeedbackFormValues = {
  display_name: "",
  company_name: "",
  is_company_public: false,
  avatar: AVATAR_PLACEHOLDER_SRC,
  rating: 0,
  summary: "",
  strengths: "",
  questions: "",
  suggestions: "",
  tags: [],
};

export const TAG_OPTIONS = [
  "문제 해결력",
  "코드 가독성",
  "코드 구조",
  "컴포넌트 설계",
  "상태 관리",
  "성능 최적화",
  "접근성",
  "반응형 UI",
  "UX",
  "디자인 완성도",
  "일관성",
  "API 연동",
  "에러 처리",
  "테스트 품질",
  "형상 관리",
  "문서화",
  "배포",
  "보안 인식",
  "성장 가능성",
];

export const FEEDBACK_FORM_ERROR_MESSAGES = {
  nameSummary: "이름과 한줄평은 필수 입력 항목입니다.",
  rating: "평점은 1점부터 5점 사이로 선택해주세요.",
  tag: "키워드를 1개 이상 선택해주세요.",
  companyPublic: "회사명 공개 여부 값이 올바르지 않습니다.",
  company: "회사명을 공개하려면 회사명을 입력해주세요.",
  email: "사용자 이메일을 확인할 수 없습니다.",
} as const;

export const NEW_FEEDBACK_FALLBACK_ERROR_MESSAGE =
  "피드백 등록에 실패했습니다.\n잠시 후 다시 시도해주세요.";

export const FEEDBACK_EDIT_FALLBACK_ERROR_MESSAGE =
  "피드백 수정에 실패했습니다.\n잠시 후 다시 시도해주세요.";
export const FEEDBACK_DELETE_FALLBACK_ERROR_MESSAGE =
  "피드백 삭제에 실패했습니다.\n잠시 후 다시 시도해주세요.";

export const FEEDBACK_NOT_FOUND_MESSAGE = "피드백을 찾을 수 없습니다.";
export const FEEDBACK_FORBIDDEN_MESSAGE = "수정 권한이 없습니다.";
export const FEEDBACK_DELETE_FORBIDDEN_MESSAGE = "삭제 권한이 없습니다.";
