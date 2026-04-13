# 인터뷰어 피드백 보드 (Next.js Page Router + Supabase)

> 권한 기반 승인 워크플로우, 코멘트 상호작용, 실시간 알림 흐름을 구현한 포트폴리오 프로젝트

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3fcf8e?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-black?logo=vercel)](https://vercel.com/)

> 코드 구조, API 설계, UX 개선 포인트에 대한 피드백을 편하게 남겨주시면 감사하겠습니다.

---

## 1) 프로젝트 소개

이 프로젝트는 인터뷰어가 피드백을 작성하고, 관리자가 검토 후 공개하는 **권한 기반 피드백 보드**입니다.

공개 목록과 사용자별 비공개 데이터를 분리하고, 작성 → 검토 → 공개로 이어지는 상태 전이를 API에서 강제하는 흐름을 구현했습니다. 여기에 더해, 공개 이후에는 작성자와 관리자가 실제로 대화를 이어갈 수 있는 **코멘트 / 답글 기능**과 승인·코멘트 이벤트를 놓치지 않도록 돕는 **알림함 / 토스트 알림**을 추가해 서비스 흐름을 보강했습니다.

- **핵심 목표**
  - 단순 CRUD를 넘어서, 실제 서비스와 유사한 **승인 프로세스**를 구현
  - 사용자/관리자 역할에 따른 **데이터 가시성 분리**
  - 최초 승인 이후 열리는 **코멘트 스레드와 관리자 응답 구조** 설계
  - 피드백 작성, 검토, 코멘트 응답이 자연스럽게 이어지는 **알림 UX** 구성
  - `getStaticProps` + 온디맨드 재검증 + API Routes + Supabase를 조합한 **실무형 풀스택 구조** 구성

---

## 2) 데모

- Live: [https://next-js-page-router-fetch-api.vercel.app/](https://next-js-page-router-fetch-api.vercel.app/)
- Test Account:
  - Reviewer: `reviewer@gmail.com` / `Reviewer1!`
  - Admin: `admin@gmail.com` / `adminadmin1!`

---

## 3) 주요 기능

### 공통

- 피드백 목록 조회 / 상세 조회
- 최신순 / 오래된순 정렬
- 프로필 / 아바타 반영
- 목록 카드에 코멘트 수 표시
- 수정 중인 승인 피드백은 공개 목록에서 `revised_pending` 프리뷰 카드로 안내
- 알림함에서 읽지 않은 알림 확인 및 읽음 처리

### Auth / Profile

- 이메일/비밀번호 로그인, 회원가입, 비밀번호 재설정
- GitHub OAuth 로그인
- 클라이언트 세션과 서버 HttpOnly 쿠키 동기화
- 내 정보 페이지에서 프로필과 공개 설정 관리
- 프로필 아바타 업로드 (JPG/PNG, 최대 2MB)
- 회원 탈퇴

### Reviewer

- 피드백 작성
- 본인 피드백 수정
- 본인 글의 승인 여부 및 승인 대기 상태 확인
- 최초 승인 이후 본인 피드백 상세에서 코멘트 / 답글 작성
- 승인 / 반려 / 코멘트 / 답글 알림 확인

### Admin

- 관리자 전용 전체 피드백 목록 조회 및 승인 대기 필터링
- 작성자 이메일 포함 전체 데이터 확인
- 승인(`approve`), 반려(`reject`), 재검토(`reopen`)
- 승인 대기 건수 확인
- 피드백 상세에서 코멘트 스레드 열람 및 관리
- 신규 피드백 / 재승인 요청 / 작성자 코멘트 알림 확인

### Comment / Interaction

- 최초 승인 이후 코멘트 스레드 개방
- 승인된 공개 글에서는 누구나 코멘트 열람 가능
- 작성자와 관리자만 코멘트 / 1단계 답글 작성 가능
- 본인 코멘트 수정, 본인 또는 관리자 삭제
- `reopen` 이후에도 기존 코멘트는 유지되며 작성자 / 관리자만 열람 가능
- 알림 링크로 피드백 상세의 특정 코멘트 / 답글 위치로 이동

### Notification

- 피드백 작성 / 재승인 요청 시 관리자에게 알림 생성
- 승인 / 반려 시 작성자에게 알림 생성
- 코멘트 / 답글 작성 시 상대 역할 또는 부모 코멘트 작성자에게 알림 생성
- Supabase Realtime 기반 토스트 알림과 헤더 알림함 연동
- 알림 읽음 처리 및 전체 읽음 처리

---

## 4) 권한 및 상태 전이

### Role 정책

- `reviewer`: 본인 데이터 중심 기능
- `admin`: 검토 큐 접근 및 상태 변경 권한

### Feedback 상태

- `pending` → 최초 작성 후 검토 대기
- `revised_pending` → 수정본 검토 대기
- `approved` → 공개 가능 상태 (`is_public=true`)
- `rejected` → 반려 상태

### 상태 전이 예시

- 작성: `pending`
- 관리자 승인: `pending | revised_pending → approved`
- 관리자 반려: `pending | revised_pending → rejected`
- 관리자 재검토: `approved | rejected → 이전 검토 큐 상태(pending 또는 revised_pending)로 복귀`

### Comment 정책

- 최초 승인 시 `comments_unlocked_at`이 열리며 코멘트 스레드 활성화
- 승인된 공개 글에서는 누구나 열람 가능
- 현재 `approved` + `is_public=true` 상태에서만 작성자와 관리자가 새 코멘트를 작성 가능
- 답글은 1단계까지만 허용
- 비공개 상태로 돌아가도 기존 코멘트는 유지되며 작성자 / 관리자만 계속 열람 가능

### Notification 정책

- 알림은 수신자 본인만 조회 및 읽음 처리 가능
- 일반 사용자는 알림을 직접 생성하거나 삭제할 수 없고, 서버 API에서 필요한 이벤트에 맞춰 생성
- 피드백이 삭제되면 해당 피드백에 연결된 알림도 함께 삭제
- 코멘트만 삭제된 경우에는 알림은 유지하되 원본 코멘트 참조만 비움

---

## 5) 기술 스택

- **Frontend**: Next.js 14 (Page Router), React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI, Sonner, lucide-react
- **Backend(BFF)**: Next.js API Routes
- **Auth/DB/Storage/Realtime**: Supabase
- **Deploy**: Vercel

---

## 6) 아키텍처 요약

```text
[Client (Next.js Pages)]
    ├─ / (프로젝트 소개 및 주요 진입점)
    ├─ SessionProvider (세션/권한 동기화)
    ├─ NotificationsProvider (알림 초기 조회 + Realtime 구독)
    ├─ /feedback (공개 데이터 SSG + 수정 중 프리뷰 + 사용자/관리자 데이터 병합 렌더링)
    ├─ /feedback/[id] (상세 + 코멘트 스레드)
    ├─ /feedback/new, /feedback/edit/[id] (피드백 작성 / 수정)
    ├─ /notifications (알림함)
    ├─ /my, /my/withdraw (프로필 관리 / 회원 탈퇴)
    └─ /admin/feedback (관리자 전체 목록 + 검토 UI)

[API Routes]
    ├─ /api/auth/*
    ├─ /api/user-roles
    ├─ /api/feedbacks/*
    ├─ /api/feedbacks/:id/comments*
    ├─ /api/notifications/*
    ├─ /api/avatar/*
    └─ /api/revalidate-list

[Supabase]
    ├─ auth.users
    ├─ user_roles
    ├─ feedbacks
    ├─ feedback_comments
    └─ notifications
```

---

## 7) 폴더 구조

```text
src/
  components/      # UI/도메인 컴포넌트
  pages/           # Page Router + API Routes
  lib/             # auth, feedback, supabase 유틸
  constants/       # 상수/문구/컬럼 정의
  types/           # 타입 정의
  scripts/         # 시드/스토리지 리셋 스크립트
```

---

## 8) 데이터 모델 / RLS 요약

### 주요 테이블

- `auth.users` → Supabase 인증 사용자
- `user_roles` → 사용자 role (`reviewer`, `admin`)
- `feedbacks` → 피드백 본문, 상태, 공개 여부, 승인 이력
- `feedback_comments` → 코멘트 / 1단계 답글
- `notifications` → 피드백 / 코멘트 이벤트 기반 알림

### 주요 컬럼

- `feedbacks.status` → 현재 검토 상태
- `feedbacks.review_queue_status` → 재검토 큐 문맥
- `feedbacks.comments_unlocked_at` → 최초 승인 이후 코멘트 스레드 개방 여부
- `feedback_comments.parent_comment_id` → 1단계 답글 구조
- `notifications.type` → 알림 종류
- `notifications.is_read`, `notifications.read_at` → 알림 읽음 상태
- `notifications.feedback_id`, `notifications.comment_id` → 알림이 가리키는 피드백 / 코멘트 참조

### RLS 방향

- 공개 승인된 피드백은 익명 포함 조회 가능
- 비공개 / 미승인 피드백은 작성자와 관리자만 조회 가능
- 코멘트는 승인 이력이 있는 피드백에서만 읽을 수 있으며, 비공개 상태에서는 작성자와 관리자만 조회 가능
- 새 코멘트 작성은 현재 승인된 공개 상태에서만 허용
- 알림은 수신자 본인만 조회하고 읽음 처리 가능

---

## 9) API 엔드포인트 요약

### Feedbacks

| Method | Endpoint                                             | 설명                                                       | 권한              |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------- | ----------------- |
| GET    | `/api/feedbacks?status=approved`                     | 공개 피드백 목록 조회                                      | 공개              |
| GET    | `/api/feedbacks?status=pending,revised_pending`      | 관리자 검토 큐 조회                                        | admin             |
| GET    | `/api/feedbacks?status=rejected`                     | 반려 목록 조회                                             | admin             |
| GET    | `/api/feedbacks/mine?status=pending,revised_pending` | 내 검토 대기/수정 대기 피드백 조회 (`admin`은 `null` 반환) | 로그인            |
| POST   | `/api/feedbacks/new`                                 | 피드백 생성                                                | 로그인            |
| PATCH  | `/api/feedbacks/:id`                                 | 피드백 수정 후 재검토 대기 전환                            | 작성자            |
| DELETE | `/api/feedbacks/:id/delete`                          | 피드백 삭제                                                | 작성자 또는 admin |
| PATCH  | `/api/feedbacks/:id/review`                          | 승인(`approve`)/반려(`reject`)/재검토(`reopen`)            | admin             |
| GET    | `/api/feedbacks/pending-count`                       | 승인 대기 건수 조회                                        | admin             |

### Comments

| Method | Endpoint                                 | 설명                              | 권한                     |
| ------ | ---------------------------------------- | --------------------------------- | ------------------------ |
| GET    | `/api/feedbacks/:id/comments`            | 코멘트 / 답글 목록 조회           | 공개 또는 작성자 / admin |
| POST   | `/api/feedbacks/:id/comments`            | 코멘트 또는 1단계 답글 작성       | 작성자 또는 admin        |
| PATCH  | `/api/feedbacks/:id/comments/:commentId` | 본인 코멘트 수정                  | 본인 작성자              |
| DELETE | `/api/feedbacks/:id/comments/:commentId` | 본인 코멘트 삭제 또는 관리자 삭제 | 본인 작성자 또는 admin   |

### Notifications

| Method | Endpoint                      | 설명                   | 권한   |
| ------ | ----------------------------- | ---------------------- | ------ |
| GET    | `/api/notifications`          | 내 알림 목록 조회      | 로그인 |
| PATCH  | `/api/notifications/read`     | 선택한 알림 읽음 처리  | 로그인 |
| PATCH  | `/api/notifications/read-all` | 내 알림 전체 읽음 처리 | 로그인 |
| PATCH  | `/api/notifications/:notiId`  | 단일 알림 읽음 처리    | 로그인 |

### Auth / User / Avatar

| Method | Endpoint              | 설명                                           | 권한   |
| ------ | --------------------- | ---------------------------------------------- | ------ |
| POST   | `/api/auth/session`   | access token 검증 후 HttpOnly 세션 쿠키 동기화 | 로그인 |
| DELETE | `/api/auth/session`   | 세션 쿠키 삭제                                 | 공개   |
| DELETE | `/api/auth/withdraw`  | 회원 탈퇴 및 저장된 아바타 정리                | 로그인 |
| POST   | `/api/user-roles`     | 사용자 role 생성/동기화 (`reviewer` 기본값)    | 로그인 |
| POST   | `/api/avatar/upload`  | 프로필 아바타 업로드                           | 로그인 |
| GET    | `/api/avatar/:userId` | 아바타 프록시 조회 (없으면 placeholder 반환)   | 공개   |

### Infra

| Method | Endpoint               | 설명                        | 권한                          |
| ------ | ---------------------- | --------------------------- | ----------------------------- |
| POST   | `/api/revalidate-list` | `/feedback` ISR 캐시 무효화 | secret header 또는 query 필요 |

- 보호 API는 `Authorization: Bearer <accessToken>` 기반으로 동작합니다.
- `GET /api/feedbacks`의 기본 조회 상태는 `approved`입니다.
- `GET /api/feedbacks/mine`의 기본 조회 상태는 `pending,revised_pending`입니다.
- `admin`이 `GET /api/feedbacks/mine`을 호출하면 목록 대신 `data: null`을 반환합니다.
- 코멘트는 첫 승인 이후부터 활성화되며, 새 작성은 현재 승인된 공개 상태에서만 가능합니다.
- 알림은 피드백 작성, 승인/반려, 코멘트/답글 작성 흐름에서 서버 API가 생성합니다.
- `POST /api/revalidate-list`는 `x-revalidate-secret` 헤더 또는 `?secret=` 쿼리가 필요합니다.

---

## 10) 로컬 실행 방법

```bash
npm ci
npm run dev
```

### 주요 스크립트

```bash
npm run dev
npm run lint
npm run build
npm run test
npm run test:unit
npm run test:api
npm run test:e2e
npm run seed:feedback
npm run seed:notifications
npm run reset:avatars
```

### 필수 환경 변수

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_AVATAR_BUCKET=
REVALIDATE_SECRET=
```

- 브라우저 클라이언트는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 사용합니다.
- 서버 anon 조회는 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 또는 public env fallback을 사용합니다.
- 관리자 작업과 일부 시스템성 API는 `SUPABASE_SERVICE_ROLE_KEY`가 필요합니다.
- 아바타 업로드/삭제는 `SUPABASE_AVATAR_BUCKET`이 필요합니다.

---

## 11) 회고

- 권한 모델과 상태 전이를 API 단에서 강제하고, UI는 해당 정책을 반영하는 구조로 설계했습니다.
- `/feedback`는 공개 데이터와 권한 데이터를 분리 수집한 뒤 하나의 리스트로 병합해, 사용자 역할에 따라 다른 보드를 보여주도록 구성했습니다.
- 코멘트 기능을 추가하면서 공개/비공개 전환이 있는 서비스에서의 상호작용 정책, RLS, 승인 이력(`comments_unlocked_at`) 설계를 함께 다뤘습니다.
- 알림 기능을 추가하면서 단순히 데이터를 저장하는 것보다 “사용자가 다음 행동을 놓치지 않도록 연결하는 흐름”이 중요하다는 점을 함께 고려했습니다.
- 단순한 CRUD를 넘어 인증/인가, 데이터 가시성, 동시성 경합, 관리자 응답 흐름 같은 실서비스 이슈를 직접 구현해본 프로젝트입니다.

---

## 12) 추후 계획

- React Suspense를 학습한 뒤 `/feedback` 목록 페이지에 역할별 비동기 경계를 적용해보고 싶습니다. 전체 공개 게시물, 작성자가 확인할 수 있는 승인 대기 게시물, 관리자가 확인할 수 있는 검토용 전체 게시물을 분리 로딩해 사용자에게 필요한 데이터를 더 자연스럽게 보여주는 방향으로 UX를 개선할 계획입니다.
- Suspense뿐 아니라 Recoil, React Query(TanStack Query) 같은 상태 관리 / 서버 상태 라이브러리도 함께 스터디 중입니다. 현재 권한 모델과 승인 워크플로우에 어떤 방식이 더 적합한지 비교해본 뒤, 데이터 패칭 구조 개선에 반영해보려 합니다.
- 장기적으로는 이메일 알림, 관리자 응답 히스토리, 알림 보관 정책처럼 서비스 운영 관점의 기능도 확장해보고 싶습니다.

---

## 13) 기술 블로그

1. [인터뷰어 피드백 보드 프로젝트를 시작한 이유](https://velog.io/@ckstlr0828/Next.js-Supabase-프로젝트-인터뷰어-피드백-보드-프로젝트를-시작한-이유)
2. [아키텍처와 인증/인가 흐름](https://velog.io/@ckstlr0828/Next.js-Supabase-프로젝트-아키텍처와-인증인가-흐름)
3. [피드백 상태 전이와 관리자 검토 워크플로우 구현](https://velog.io/@ckstlr0828/Next.js-Supabase-프로젝트-피드백-상태-전이와-관리자-검토-워크플로우-구현)
4. [service_role과 anon key, 정말 적재적소에 쓰고 있을까?](https://velog.io/@ckstlr0828/Next.js-Supabase-servicerole과-anon-key-정말-적재적소에-쓰고-있을까)
5. [승인 이력 기반 코멘트 기능 설계하기](https://velog.io/@ckstlr0828/Next.js-Supabase-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EC%8A%B9%EC%9D%B8-%EC%9D%B4%EB%A0%A5-%EA%B8%B0%EB%B0%98-%EC%BD%94%EB%A9%98%ED%8A%B8-%EA%B8%B0%EB%8A%A5-%EC%84%A4%EA%B3%84%ED%95%98%EA%B8%B0)
6. [상태 변화와 코멘트 흐름을 놓치지 않게 알림 기능 설계하기](https://velog.io/@ckstlr0828/Next.js-Supabase-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EC%83%81%ED%83%9C-%EB%B3%80%ED%99%94%EC%99%80-%EC%BD%94%EB%A9%98%ED%8A%B8-%ED%9D%90%EB%A6%84%EC%9D%84-%EB%86%93%EC%B9%98%EC%A7%80-%EC%95%8A%EA%B2%8C-%EC%95%8C%EB%A6%BC-%EA%B8%B0%EB%8A%A5-%EC%84%A4%EA%B3%84%ED%95%98%EA%B8%B0)

---

## 14) 작성자

- 이름: 최찬식
- GitHub: [https://github.com/CHANSIK-CHOI](https://github.com/CHANSIK-CHOI)
- Velog: [https://velog.io/@ckstlr0828/posts](https://velog.io/@ckstlr0828/posts)
- Email: [ccsik0828@gmail.com](mailto:ccsik0828@gmail.com)
