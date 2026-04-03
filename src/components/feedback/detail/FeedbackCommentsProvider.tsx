import { feedbackCommentsReducer } from "@/components/feedback/detail/FeedbackCommentsReducer";
import { useSession } from "@/components/session";
import {
  createFeedbackComment,
  deleteFeedbackComment,
  updateFeedbackComment,
} from "@/lib/feedback/client";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";
import type { FeedbackComment, FeedbackCommentRow } from "@/types/feedback-comment";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

type FeedbackCommentsProviderProps = {
  feedback: FeedbackPublicAndEmailRow;
  isAuthor: boolean;
  isAdmin: boolean;
  initialComments: FeedbackComment[];
  children: ReactNode;
};

type FeedbackCommentsStateContextValue = {
  comments: FeedbackCommentRow[];
  commentById: Map<FeedbackComment["id"], FeedbackCommentRow>;
  replyIdsByParentId: Map<
    NonNullable<FeedbackComment["parent_comment_id"]>,
    FeedbackComment["id"][]
  >;
  firstDepthCommentIds: FeedbackComment["id"][];
  firstDepthCount: number;
  replyCount: number;
};

type FeedbackCommentsMetaContextValue = {
  feedbackId: FeedbackPublicAndEmailRow["id"];
  feedbackAuthorId: FeedbackPublicAndEmailRow["author_id"];
  currentUserId: string | null;
  isAdmin: boolean;
  canWrite: boolean;
  hasCommentsBeenUnlocked: boolean;
  canEveryoneReadComments: boolean;
  composerTitle: string;
  composerDescription: string;
  composerPlaceholder: string;
};

type FeedbackCommentsActionsContextValue = {
  createComment: (newCommentText: string) => Promise<void>;
  createReply: (parentCommentId: string, replyText: string) => Promise<void>;
  updateComment: (commentId: FeedbackComment["id"], updatedCommentText: string) => Promise<void>;
  deleteComment: (commentId: FeedbackComment["id"]) => Promise<void>;
};

const FeedbackCommentsStateContext = createContext<FeedbackCommentsStateContextValue | null>(null);
const FeedbackCommentsMetaContext = createContext<FeedbackCommentsMetaContextValue | null>(null);
const FeedbackCommentsActionsContext = createContext<FeedbackCommentsActionsContextValue | null>(
  null
);

const useRequiredContext = <T,>(value: T | null, name: string) => {
  if (!value) {
    throw new Error(`${name} must be used within FeedbackCommentsProvider.`);
  }

  return value;
};

export default function FeedbackCommentsProvider({
  feedback,
  isAuthor,
  isAdmin,
  initialComments,
  children,
}: FeedbackCommentsProviderProps) {
  const { session, getAccessTokenOrThrow } = useSession();
  const [{ comments }, dispatch] = useReducer(feedbackCommentsReducer, {
    comments: initialComments,
  });
  const currentUserId = session?.user?.id ?? null;
  const canWrite =
    Boolean(feedback.comments_unlocked_at) &&
    feedback.status === "approved" &&
    feedback.is_public &&
    (isAuthor || isAdmin);

  useEffect(() => {
    dispatch({ type: "RESET_TO_INITIAL_COMMENTS", comments: initialComments });
  }, [feedback.id, initialComments]);

  const createComment = useCallback(
    async (newCommentText: string) => {
      if (!canWrite) {
        throw new Error("현재 상태에서는 새 코멘트를 작성할 수 없습니다.");
      }

      const accessToken = await getAccessTokenOrThrow();
      const createdComment = await createFeedbackComment({
        feedbackId: feedback.id,
        accessToken,
        payload: {
          body: newCommentText,
          parentCommentId: null,
        },
      });

      dispatch({ type: "APPEND_COMMENT", comment: createdComment });
    },
    [canWrite, feedback.id, getAccessTokenOrThrow]
  );

  const createReply = useCallback(
    async (parentCommentId: string, replyText: string) => {
      if (!canWrite) {
        throw new Error("현재 상태에서는 답글을 작성할 수 없습니다.");
      }

      const accessToken = await getAccessTokenOrThrow();
      const createdComment = await createFeedbackComment({
        feedbackId: feedback.id,
        accessToken,
        payload: {
          body: replyText,
          parentCommentId,
        },
      });

      dispatch({ type: "APPEND_COMMENT", comment: createdComment });
    },
    [canWrite, feedback.id, getAccessTokenOrThrow]
  );

  const updateComment = useCallback(
    async (commentId: FeedbackComment["id"], updatedCommentText: string) => {
      if (!canWrite) {
        throw new Error("현재 상태에서는 코멘트를 수정할 수 없습니다.");
      }

      const accessToken = await getAccessTokenOrThrow();
      const updatedComment = await updateFeedbackComment({
        feedbackId: feedback.id,
        commentId,
        accessToken,
        payload: { body: updatedCommentText },
      });

      dispatch({ type: "REPLACE_COMMENT", comment: updatedComment });
    },
    [canWrite, feedback.id, getAccessTokenOrThrow]
  );

  const deleteComment = useCallback(
    async (commentId: FeedbackComment["id"]) => {
      const accessToken = await getAccessTokenOrThrow();

      await deleteFeedbackComment({
        feedbackId: feedback.id,
        commentId,
        accessToken,
      });

      dispatch({ type: "REMOVE_COMMENT_THREAD", commentId });
    },
    [feedback.id, getAccessTokenOrThrow]
  );

  const stateValue = useMemo<FeedbackCommentsStateContextValue>(() => {
    const commentById = new Map<FeedbackComment["id"], FeedbackCommentRow>();
    const replyIdsByParentId = new Map<
      NonNullable<FeedbackComment["parent_comment_id"]>,
      FeedbackComment["id"][]
    >();
    const firstDepthCommentIds: FeedbackComment["id"][] = [];

    comments.forEach((comment) => {
      commentById.set(comment.id, comment);

      if (comment.parent_comment_id === null) {
        firstDepthCommentIds.push(comment.id);
        return;
      }

      const replyIds = replyIdsByParentId.get(comment.parent_comment_id) ?? [];
      replyIdsByParentId.set(comment.parent_comment_id, [...replyIds, comment.id]);
    });

    return {
      comments,
      commentById,
      replyIdsByParentId,
      firstDepthCommentIds,
      firstDepthCount: firstDepthCommentIds.length,
      replyCount: comments.length - firstDepthCommentIds.length,
    };
  }, [comments]);

  const metaValue = useMemo<FeedbackCommentsMetaContextValue>(() => {
    const hasCommentsBeenUnlocked = Boolean(feedback.comments_unlocked_at);
    const canEveryoneReadComments =
      hasCommentsBeenUnlocked && feedback.status === "approved" && feedback.is_public;
    const composerTitle = !hasCommentsBeenUnlocked
      ? "코멘트 잠금 전"
      : canWrite
        ? "코멘트 남기기"
        : "코멘트 작성 정책";
    const composerDescription = !hasCommentsBeenUnlocked
      ? "이 게시물은 아직 최초 승인 전이라 코멘트가 열리지 않았습니다. 첫 승인 이후부터 기존 코멘트가 유지됩니다."
      : canWrite
        ? "현재는 승인된 공개 상태이므로 작성자와 관리자만 코멘트를 남길 수 있습니다."
        : isAuthor || isAdmin
          ? "현재는 비공개 상태라 새 코멘트 작성이 잠겨 있습니다. 다시 승인되면 이어서 작성할 수 있습니다."
          : "코멘트는 누구나 읽을 수 있지만, 작성은 게시물 작성자와 관리자만 가능합니다.";
    const composerPlaceholder = canWrite
      ? "면접 흐름, 수정 포인트, 공개 보드에서 강조하고 싶은 메시지를 남겨보세요."
      : !hasCommentsBeenUnlocked
        ? "최초 승인 이후부터 코멘트를 작성할 수 있습니다."
        : "현재 상태에서는 새 코멘트를 작성할 수 없습니다.";

    return {
      feedbackId: feedback.id,
      feedbackAuthorId: feedback.author_id,
      currentUserId,
      isAdmin,
      canWrite,
      hasCommentsBeenUnlocked,
      canEveryoneReadComments,
      composerTitle,
      composerDescription,
      composerPlaceholder,
    };
  }, [feedback, currentUserId, isAdmin, isAuthor, canWrite]);

  const actionsValue = useMemo<FeedbackCommentsActionsContextValue>(
    () => ({
      createComment,
      createReply,
      updateComment,
      deleteComment,
    }),
    [createComment, createReply, deleteComment, updateComment]
  );

  return (
    <FeedbackCommentsStateContext.Provider value={stateValue}>
      <FeedbackCommentsMetaContext.Provider value={metaValue}>
        <FeedbackCommentsActionsContext.Provider value={actionsValue}>
          {children}
        </FeedbackCommentsActionsContext.Provider>
      </FeedbackCommentsMetaContext.Provider>
    </FeedbackCommentsStateContext.Provider>
  );
}

export const useFeedbackCommentsState = () =>
  useRequiredContext(useContext(FeedbackCommentsStateContext), "FeedbackCommentsStateContext");

export const useFeedbackCommentsMeta = () =>
  useRequiredContext(useContext(FeedbackCommentsMetaContext), "FeedbackCommentsMetaContext");

export const useFeedbackCommentsActions = () =>
  useRequiredContext(useContext(FeedbackCommentsActionsContext), "FeedbackCommentsActionsContext");
