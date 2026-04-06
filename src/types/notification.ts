import type { FeedbackPublicRow } from "@/types/feedback";
import { FeedbackCommentRow } from "./feedback-comment";

/*
  작성자가 새 피드백 작성
  수신자: 모든 관리자
  타입: feedback_submitted

  작성자가 승인된 글 수정해서 재승인 필요
  수신자: 모든 관리자
  타입: feedback_resubmitted

  관리자가 승인 또는 반려
  수신자: 피드백 작성자
  타입: feedback_approved 또는 feedback_rejected

  코멘트 작성, parent_comment_id is null
  작성자가 코멘트 작성한 경우:
  수신자: 모든 관리자
  타입: feedback_comment

  관리자가 코멘트 작성한 경우:
  수신자: 피드백 작성자
  타입: feedback_comment
  
  답글 작성, parent_comment_id is not null
  수신자: 부모 코멘트 작성자 1명
  타입: feedback_reply
  단, 답글 작성자와 부모 코멘트 작성자가 같으면 알림 생성 안 함
*/
export type NotificationType =
  | "feedback_submitted"
  | "feedback_resubmitted"
  | "feedback_approved"
  | "feedback_rejected"
  | "feedback_comment"
  | "feedback_reply";

export type NotificationFeedbackStatus = FeedbackPublicRow["status"];

export type NotificationMetadata = {
  feedback_status?: NotificationFeedbackStatus | null;
  parent_comment_id?: FeedbackCommentRow["parent_comment_id"] | null;
};

/*
  recipient_user_id = 누가 받는가 : recipient_user_id -> auth.users(id)
  actor_user_id = 누가 행동했는가 : actor_user_id -> auth.users(id)
  feedback_id, comment_id = 무엇에 대한 알림인가
    - feedback_id -> feedbacks(id)
    - comment_id -> feedback_comments(id)
  type, title, body, link = 화면에 어떻게 보여줄 것인가
  is_read, read_at = 읽음 상태
  metadata = 추가 맥락
  created_at = 언제 생겼는가
*/

/*
  [삭제 규칙]
  recipient_user_id on delete cascade
  사용자가 삭제되면 그 사람 알림도 같이 삭제

  actor_user_id on delete set null
  행동한 사용자가 없어져도 알림 자체는 남기고 actor만 비움

  feedback_id, comment_id on delete set null
  원본 피드백/코멘트가 삭제돼도 알림 자체는 남길 수 있게 함
*/

/*
  [제약조건]
  notifications_type_check
  type은 정해진 6개 값만 들어갈 수 있어요.
  즉 오타나 엉뚱한 타입 방지

  notifications_title_check
  제목은 공백 제외 1자 이상, 120자 이하

  notifications_body_check
  본문은 공백 제외 1자 이상, 500자 이하

  notifications_link_check
  링크는 비어 있으면 안 됨

  notifications_metadata_check
  metadata는 JSON 객체여야 함
  예: { "feedback_status": "approved" }
  배열이나 숫자는 안 됨

  notifications_actor_recipient_check
  행동한 사람과 받는 사람이 같으면 안 된다는 뜻
  즉 자기 자신에게 알림 보내는 실수를 DB 차원에서 막음

  notifications_comment_feedback_check
  comment_id가 있으면 feedback_id도 있어야 함
  댓글은 항상 어떤 피드백에 속하니까 그걸 강제하는 규칙이에요.
*/

/*
  [인덱스 생성]
  notifications_recipient_created_at_idx
  특정 사용자의 최신 알림 목록 조회를 빠르게 함

  notifications_recipient_unread_created_at_idx
  특정 사용자의 안 읽은 알림만 빠르게 조회 -> where is_read = false가 붙은 부분 인덱스라서, 안 읽은 알림만 자주 조회할 때 효율적

  notifications_feedback_created_at_idx
  특정 피드백 관련 알림 조회를 빠르게 함

  notifications_comment_created_at_idx
  특정 코멘트 관련 알림 조회를 빠르게 함
*/

/*
  [sync_notification_read_state() 함수]
  insert 시
  is_read = true면 read_at = now()
  is_read = false면 read_at = null

  update 시
  읽음 상태 외 다른 필드는 수정하지 못하게 막음
  - 수신자 변경 금지
  - type 변경 금지
  - title/body/link 변경 금지
  - metadata 변경 금지
  -> 즉 update로 바꿀 수 있는 건 사실상 is_read와 그에 따라 바뀌는 read_at
*/

/*
  [트리거 생성]
  notifications_sync_read_state - notifications 테이블에 연결
  - 알림이 추가되기 직전
  - 알림이 수정되기 직전
  앱 코드가 read_at를 직접 신경 안 써도 DB가 알아서 맞춰줍니다.
*/

/*
  [RLS 활성화]
  notifications 테이블에 행 단위 권한 제어를 on-> 이걸 켜야 “내 알림만 보인다” 같은 정책이 실제로 적용
*/

/*
  [insert/delete 정책이 없는 이유]
  이 SQL에는 insert, delete 정책이 없습니다.
  일반 사용자는!
  - 알림 직접 생성 못 함
  - 알림 직접 삭제 못 함
*/

/*
  [Realtime 대상 등록]
  notifications를 Supabase Realtime의 감시 대상에 넣는 작업이에요.

  그래서 나중에 브라우저에서:

  notifications에 새 row insert됨
  실시간 이벤트 받음
  토스트 띄움
  이 흐름이 가능
*/
export type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  feedback_id: string | null;
  comment_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  read_at: string | null;
  metadata: NotificationMetadata;
  created_at: string;
};

export type NotificationListItem = NotificationRow;

export type NotificationUnreadCount = {
  count: number;
};

export type NotificationReadResult = Pick<NotificationRow, "id" | "is_read" | "read_at">;

export type NotificationItemData = Omit<
  NotificationRow,
  "recipient_user_id" | "actor_user_id" | "feedback_id" | "comment_id" | "metadata"
>;
