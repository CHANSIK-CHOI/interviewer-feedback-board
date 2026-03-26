import { AVATAR_PLACEHOLDER_SRC } from "@/constants";
import type { FeedbackPublicBase } from "@/types/feedback";

export type FeedbackCommentRole = "author" | "admin";

export type FeedbackCommentPreview = {
  id: string;
  parentCommentId: string | null;
  authorName: string;
  authorAvatarUrl: string;
  role: FeedbackCommentRole;
  body: string;
  createdAt: string;
  editedAt: string | null;
};

const AUTHOR_COMMENT_BODIES = [
  "면접 흐름이 좋았던 이유를 간단히 정리해두었습니다. 다음 번에도 같은 기준으로 준비하면 도움이 될 것 같아요.",
  "질문 의도가 명확해서 답변을 정리하기 쉬웠습니다. 보완하면 좋을 포인트를 메모처럼 남겨봅니다.",
  "다음 지원 때는 강점과 개선 포인트를 분리해서 준비해보려고 합니다. 기록 차원에서 코멘트를 남겨둡니다.",
  "실무형 질문이 많아서 좋았습니다. 답변 구조를 더 짧고 선명하게 가져가면 전달력이 더 좋아질 것 같습니다.",
];

const ADMIN_COMMENT_BODIES = [
  "공개된 피드백 흐름을 해치지 않도록 핵심만 남겼습니다. 추상적인 표현보다 장면 중심 서술이 더 잘 읽힙니다.",
  "요약 문장이 좋아서 공개 보드에서도 이해가 잘 됩니다. 구체 사례를 한 줄만 더 보강하면 완성도가 높아집니다.",
  "면접 과정 설명이 비교적 선명합니다. 강점과 개선 제안을 조금 더 대비되게 적으면 다른 사용자에게도 도움이 됩니다.",
  "내용은 충분히 좋습니다. 공개 게시물에서는 결과보다 맥락이 잘 보이도록 문장을 조금 더 다듬는 방향을 권장합니다.",
];

const REPLY_BODIES = [
  "이 포인트를 반영해서 다음 회차에는 답변 구조를 먼저 말하고 사례를 뒤에 붙여보겠습니다.",
  "확인했습니다. 공개 보드에서 읽히는 방식까지 고려해서 표현을 더 정리해보겠습니다.",
  "좋은 기준 감사합니다. 다음 수정 때는 질문 맥락과 답변 근거를 더 분명히 적어보겠습니다.",
  "이 방향이 맞는 것 같습니다. 내용을 조금 더 압축해서 다시 정리해보겠습니다.",
];

const HOUR = 1000 * 60 * 60;

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const pickBody = (items: string[], seed: number) => {
  return items[seed % items.length];
};

export const getMockFeedbackCommentCount = (feedbackId: string) => {
  const seed = hashSeed(feedbackId);
  const topLevelCount = 2 + (seed % 2);
  const replyCount = Array.from({ length: topLevelCount }).reduce((total, _, index) => {
    return total + (((seed >> index) & 1) === 0 ? 1 : 0);
  }, 0);

  return topLevelCount + replyCount;
};

export const buildMockFeedbackComments = ({
  feedbackId,
  createdAt,
  authorName,
  authorAvatarUrl,
  adminName,
}: {
  feedbackId: FeedbackPublicBase["id"];
  createdAt: FeedbackPublicBase["created_at"];
  authorName: string;
  authorAvatarUrl: string | null;
  adminName: string | null;
}): FeedbackCommentPreview[] => {
  const seed = hashSeed(feedbackId);
  const topLevelCount = 2 + (seed % 2);
  const baseTime = new Date(createdAt).getTime();
  const safeBaseTime = Number.isNaN(baseTime) ? Date.UTC(2026, 0, 1) : baseTime;
  const resolvedAuthorAvatarUrl = authorAvatarUrl || AVATAR_PLACEHOLDER_SRC;
  const resolvedAdminName = adminName || "관리자";
  const comments: FeedbackCommentPreview[] = [];

  for (let index = 0; index < topLevelCount; index += 1) {
    const isAuthorComment = ((seed + index) & 1) === 0;
    const topLevelId = `${feedbackId}-comment-${index + 1}`;
    const topLevelCreatedAt = new Date(safeBaseTime + (index + 1) * 8 * HOUR).toISOString();
    const isEdited = ((seed + index) % 3) === 0;

    comments.push({
      id: topLevelId,
      parentCommentId: null,
      authorName: isAuthorComment ? authorName : resolvedAdminName,
      authorAvatarUrl: isAuthorComment ? resolvedAuthorAvatarUrl : AVATAR_PLACEHOLDER_SRC,
      role: isAuthorComment ? "author" : "admin",
      body: pickBody(
        isAuthorComment ? AUTHOR_COMMENT_BODIES : ADMIN_COMMENT_BODIES,
        seed + index
      ),
      createdAt: topLevelCreatedAt,
      editedAt: isEdited ? new Date(safeBaseTime + (index + 1) * 9 * HOUR).toISOString() : null,
    });

    const shouldAddReply = ((seed >> index) & 1) === 0;
    if (!shouldAddReply) continue;

    const replyIsAuthor = !isAuthorComment;
    comments.push({
      id: `${topLevelId}-reply`,
      parentCommentId: topLevelId,
      authorName: replyIsAuthor ? authorName : resolvedAdminName,
      authorAvatarUrl: replyIsAuthor ? resolvedAuthorAvatarUrl : AVATAR_PLACEHOLDER_SRC,
      role: replyIsAuthor ? "author" : "admin",
      body: pickBody(REPLY_BODIES, seed + index * 7),
      createdAt: new Date(safeBaseTime + (index + 1) * 8 * HOUR + 45 * 60 * 1000).toISOString(),
      editedAt: null,
    });
  }

  return comments;
};
