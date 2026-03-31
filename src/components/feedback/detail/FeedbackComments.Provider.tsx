import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { useSession } from "@/components/session";
import { resolveAccessToken } from "@/lib/auth/client";
import {
  createFeedbackComment,
  deleteFeedbackComment,
  updateFeedbackComment,
} from "@/lib/feedback/client";
import type { FeedbackPublicAndEmailRow } from "@/types/feedback";
import type { FeedbackComment, FeedbackCommentRow } from "@/types/feedback-comment";

type FeedbackCommentsProviderProps = {
  feedback: FeedbackPublicAndEmailRow;
  isAuthor: boolean;
  isAdmin: boolean;
  serverComments: FeedbackComment[];
  children: ReactNode;
};

type FeedbackCommentsState = {
  commentItems: FeedbackCommentRow[];
};

type FeedbackCommentsAction =
  | { type: "reset_from_server"; serverComments: FeedbackCommentRow[] }
  | { type: "append_comment"; commentItem: FeedbackCommentRow }
  | { type: "replace_comment"; commentItem: FeedbackCommentRow }
  | { type: "remove_comment_thread"; commentId: FeedbackComment["id"] };

type FeedbackCommentsStateContextValue = {
  commentItems: FeedbackCommentRow[];
  commentById: Map<FeedbackComment["id"], FeedbackCommentRow>;
  replyIdsByParentId: Map<FeedbackComment["id"], FeedbackComment["id"][]>;
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
  updateComment: (
    commentId: FeedbackComment["id"],
    updatedCommentText: string
  ) => Promise<void>;
  deleteComment: (commentId: FeedbackComment["id"]) => Promise<void>;
};

const FeedbackCommentsStateContext = createContext<FeedbackCommentsStateContextValue | null>(null);
const FeedbackCommentsMetaContext = createContext<FeedbackCommentsMetaContextValue | null>(null);
const FeedbackCommentsActionsContext = createContext<FeedbackCommentsActionsContextValue | null>(
  null
);

const feedbackCommentsReducer = (
  state: FeedbackCommentsState,
  action: FeedbackCommentsAction
): FeedbackCommentsState => {
  switch (action.type) {
    case "reset_from_server":
      return { commentItems: action.serverComments };
    case "append_comment":
      return { commentItems: [...state.commentItems, action.commentItem] };
    case "replace_comment":
      return {
        commentItems: state.commentItems.map((item) =>
          item.id === action.commentItem.id ? action.commentItem : item
        ),
      };
    case "remove_comment_thread":
      return {
        commentItems: state.commentItems.filter(
          (item) => item.id !== action.commentId && item.parent_comment_id !== action.commentId
        ),
      };
    default:
      return state;
  }
};

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
  serverComments,
  children,
}: FeedbackCommentsProviderProps) {
  const { session, supabaseBrowserClient } = useSession();
  const [{ commentItems }, dispatch] = useReducer(feedbackCommentsReducer, {
    commentItems: serverComments,
  });
  const currentUserId = session?.user?.id ?? null;
  const hasCommentsBeenUnlocked = Boolean(feedback.comments_unlocked_at);
  const canEveryoneReadComments =
    hasCommentsBeenUnlocked && feedback.status === "approved" && feedback.is_public;
  const canWrite = canEveryoneReadComments && (isAuthor || isAdmin);

  useEffect(() => {
    dispatch({ type: "reset_from_server", serverComments });
  }, [feedback.id, serverComments]);

  const resolveCommentAccessToken = useCallback(async () => {
    return resolveAccessToken({
      supabaseBrowserClient,
      fallbackAccessToken: session?.access_token ?? null,
    });
  }, [session?.access_token, supabaseBrowserClient]);

  const createComment = useCallback(
    async (newCommentText: string) => {
      if (!canWrite) {
        throw new Error("현재 상태에서는 새 코멘트를 작성할 수 없습니다.");
      }

      const accessToken = await resolveCommentAccessToken();
      const createdComment = await createFeedbackComment({
        feedbackId: feedback.id,
        accessToken,
        payload: {
          body: newCommentText,
          parentCommentId: null,
        },
      });

      dispatch({ type: "append_comment", commentItem: createdComment });
    },
    [canWrite, feedback.id, resolveCommentAccessToken]
  );

  const createReply = useCallback(
    async (parentCommentId: string, replyText: string) => {
      if (!canWrite) {
        throw new Error("현재 상태에서는 답글을 작성할 수 없습니다.");
      }

      const accessToken = await resolveCommentAccessToken();
      const createdComment = await createFeedbackComment({
        feedbackId: feedback.id,
        accessToken,
        payload: {
          body: replyText,
          parentCommentId,
        },
      });

      dispatch({ type: "append_comment", commentItem: createdComment });
    },
    [canWrite, feedback.id, resolveCommentAccessToken]
  );

  const updateComment = useCallback(
    async (commentId: FeedbackComment["id"], updatedCommentText: string) => {
      if (!canWrite) {
        throw new Error("현재 상태에서는 코멘트를 수정할 수 없습니다.");
      }

      const accessToken = await resolveCommentAccessToken();
      const updatedComment = await updateFeedbackComment({
        feedbackId: feedback.id,
        commentId,
        accessToken,
        payload: { body: updatedCommentText },
      });

      dispatch({ type: "replace_comment", commentItem: updatedComment });
    },
    [canWrite, feedback.id, resolveCommentAccessToken]
  );

  const deleteComment = useCallback(
    async (commentId: FeedbackComment["id"]) => {
      const accessToken = await resolveCommentAccessToken();

      await deleteFeedbackComment({
        feedbackId: feedback.id,
        commentId,
        accessToken,
      });

      dispatch({ type: "remove_comment_thread", commentId });
    },
    [feedback.id, resolveCommentAccessToken]
  );

  const stateValue = useMemo<FeedbackCommentsStateContextValue>(() => {
    const commentById = new Map<FeedbackComment["id"], FeedbackCommentRow>();
    const replyIdsByParentId = new Map<FeedbackComment["id"], FeedbackComment["id"][]>();
    const firstDepthCommentIds: FeedbackComment["id"][] = [];

    commentItems.forEach((commentItem) => {
      commentById.set(commentItem.id, commentItem);

      if (commentItem.parent_comment_id === null) {
        firstDepthCommentIds.push(commentItem.id);
        return;
      }

      const replyIds = replyIdsByParentId.get(commentItem.parent_comment_id) ?? [];
      replyIdsByParentId.set(commentItem.parent_comment_id, [...replyIds, commentItem.id]);
    });

    return {
      commentItems,
      commentById,
      replyIdsByParentId,
      firstDepthCommentIds,
      firstDepthCount: firstDepthCommentIds.length,
      replyCount: commentItems.length - firstDepthCommentIds.length,
    };
  }, [commentItems]);

  const metaValue = useMemo<FeedbackCommentsMetaContextValue>(() => {
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
  }, [
    canEveryoneReadComments,
    canWrite,
    currentUserId,
    feedback.author_id,
    feedback.id,
    hasCommentsBeenUnlocked,
    isAdmin,
    isAuthor,
  ]);

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
