import type { FeedbackComment, FeedbackCommentRow } from "@/types/feedback-comment";

export type FeedbackCommentsState = {
  comments: FeedbackCommentRow[];
};

export type FeedbackCommentsAction =
  | { type: "RESET_TO_INITIAL_COMMENTS"; comments: FeedbackCommentRow[] }
  | { type: "APPEND_COMMENT"; comment: FeedbackCommentRow }
  | { type: "REPLACE_COMMENT"; comment: FeedbackCommentRow }
  | { type: "REMOVE_COMMENT_THREAD"; commentId: FeedbackComment["id"] };

export const feedbackCommentsReducer = (
  state: FeedbackCommentsState,
  action: FeedbackCommentsAction
): FeedbackCommentsState => {
  switch (action.type) {
    case "RESET_TO_INITIAL_COMMENTS":
      return { comments: action.comments };
    case "APPEND_COMMENT":
      return { comments: [...state.comments, action.comment] };
    case "REPLACE_COMMENT":
      return {
        comments: state.comments.map((item) =>
          item.id === action.comment.id ? action.comment : item
        ),
      };
    case "REMOVE_COMMENT_THREAD":
      return {
        comments: state.comments.filter(
          (item) => item.id !== action.commentId && item.parent_comment_id !== action.commentId
        ),
      };
    default:
      return state;
  }
};
