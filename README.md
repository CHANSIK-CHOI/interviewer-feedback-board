# 인터뷰어 피드백 보드 (Next.js Page Router + Supabase)

> 권한 기반 승인 워크플로우(작성 → 검토 → 공개)를 구현한 포트폴리오 프로젝트

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3fcf8e?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-black?logo=vercel)](https://vercel.com/)

> 코드 구조, API 설계, UX 개선 포인트에 대한 피드백을 편하게 남겨주시면 감사하겠습니다.

---

## 1) 프로젝트 소개

이 프로젝트는 인터뷰어 피드백을 작성하고, 관리자가 검토 후 공개하는 **권한 기반 피드백 보드**입니다.

- **핵심 목표**
  - 단순 CRUD를 넘어서, 실제 서비스와 유사한 **승인 프로세스**를 구현
  - 사용자/관리자 역할에 따른 **데이터 가시성 분리**
  - Next.js API Routes + Supabase를 활용한 **실무형 풀스택 구조** 구성

---

## 2) 데모

- Live: `https://next-js-page-router-fetch-api.vercel.app/`
- Test Account:
  - Reviewer: `reviewer@gmail.com` / `Reviewer1!`
  - Admin: `admin@gmail.com` / `adminadmin1!`

---

## 3) 주요 기능

### 공통

- 피드백 목록 조회 / 상세 조회
- 최신순/오래된순 정렬
- 프로필/아바타 반영

### Auth / Profile

- 이메일/비밀번호 로그인, 회원가입, 비밀번호 재설정
- GitHub OAuth 로그인
- 프로필 아바타 업로드 (JPG/PNG, 최대 2MB)
- 회원 탈퇴

### Reviewer

- 피드백 작성
- 본인 피드백 수정
- 본인 글의 승인, 승인 대기중 상태 확인

### Admin

- 검토 큐 조회 (pending / revised_pending / rejected)
- 승인(approve), 반려(reject), 재검토(reopen)
- 승인 대기 건수 확인

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
- 관리자 재검토: `approved | rejected → pending | revised_pending`

---

## 5) 기술 스택

- **Frontend**: Next.js 14 (Page Router), React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI, Sonner
- **Backend(BFF)**: Next.js API Routes
- **Auth/DB/Storage**: Supabase
- **Deploy**: Vercel

---

## 6) 아키텍처 요약

```text
[Client (Next.js Pages)]
    ├─ SessionProvider (세션/권한 동기화)
    ├─ /feedback (공개 + 사용자/관리자 데이터 병합 렌더링)
    └─ /admin/feedback (관리자 검토 UI)

[API Routes]
    ├─ /api/auth/*
    ├─ /api/user-roles
    ├─ /api/feedbacks/*
    ├─ /api/avatar/*
    └─ /api/revalidate-list

[Supabase]
    ├─ auth.users
    ├─ user_roles
    └─ feedbacks
```

---

## 7) 폴더 구조

```
src/
  components/      # UI/도메인 컴포넌트
  pages/           # Page Router + API Routes
  lib/             # auth, feedback, supabase 유틸
  constants/       # 상수/문구/컬럼 정의
  types/           # 타입 정의
  scripts/         # 시드/스토리지 리셋 스크립트
```

---

## 8) API 엔드포인트 요약

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

| Method | Endpoint               | 설명                        | 권한               |
| ------ | ---------------------- | --------------------------- | ------------------ |
| POST   | `/api/revalidate-list` | `/feedback` ISR 캐시 무효화 | secret header 필요 |

- 보호 API는 `Authorization: Bearer <accessToken>` 기반으로 동작합니다.
- `GET /api/feedbacks`의 기본 조회 상태는 `approved`입니다.
- `GET /api/feedbacks/mine`의 기본 조회 상태는 `pending,revised_pending`입니다.
- `admin`이 `GET /api/feedbacks/mine`을 호출하면 목록 대신 `data: null`을 반환합니다.
- `POST /api/revalidate-list`는 `x-revalidate-secret` 헤더가 필요합니다.

---

## 9) 회고

- 권한 모델과 상태 전이를 API 단에서 강제하며, UI는 해당 정책을 반영하는 구조로 설계했습니다.
- "보이는 기능"뿐 아니라 인증/인가, 데이터 가시성, 동시성 경합 등 실서비스 이슈를 다뤘습니다.

---

## 10) 추후 계획

- React Suspense를 학습한 뒤 `/feedback` 목록 페이지에 역할별 비동기 경계를 적용해보고 싶습니다. 전체 공개 게시물, 작성자가 확인할 수 있는 승인 대기 게시물, 관리자가 확인할 수 있는 검토용 전체 게시물을 분리 로딩해 사용자에게 필요한 데이터를 더 자연스럽게 보여주는 방향으로 UX를 개선할 계획입니다.
- Suspense뿐 아니라 Recoil, React Query(TanStack Query) 같은 상태 관리/서버 상태 라이브러리도 함께 스터디 중입니다. 현재 권한 모델과 승인 워크플로우에 어떤 방식이 더 적합한지 비교해본 뒤, 데이터 패칭 구조 개선에 반영해보려 합니다.

---

## 11) 기술 블로그

1. [프로젝트 기획과 요구사항 정의](https://velog.io/@ckstlr0828/Next.js-Supabase-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EA%B8%B0%ED%9A%8D%EA%B3%BC-%EC%9A%94%EA%B5%AC%EC%82%AC%ED%95%AD-%EC%A0%95%EC%9D%98)
2. [아키텍처와 인증/인가 흐름](https://velog.io/@ckstlr0828/Next.js-Supabase-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98%EC%99%80-%EC%9D%B8%EC%A6%9D%EC%9D%B8%EA%B0%80-%ED%9D%90%EB%A6%84)
3. [피드백 상태 전이와 관리자 검토 워크플로우 구현](https://velog.io/@ckstlr0828/Next.js-Supabase-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%ED%94%BC%EB%93%9C%EB%B0%B1-%EC%83%81%ED%83%9C-%EC%A0%84%EC%9D%B4%EC%99%80-%EA%B4%80%EB%A6%AC%EC%9E%90-%EA%B2%80%ED%86%A0-%EC%9B%8C%ED%81%AC%ED%94%8C%EB%A1%9C%EC%9A%B0-%EA%B5%AC%ED%98%84)
4. [회고: 이 프로젝트에서 배운 점과 다음 개선 로드맵](https://velog.io/@ckstlr0828/Next.js-Supabase-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%ED%9A%8C%EA%B3%A0-%EC%9D%B4-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%EC%97%90%EC%84%9C-%EB%B0%B0%EC%9A%B4-%EC%A0%90%EA%B3%BC-%EB%8B%A4%EC%9D%8C-%EA%B0%9C%EC%84%A0-%EB%A1%9C%EB%93%9C%EB%A7%B5)

## 11) 작성자

- 이름: 최찬식
- GitHub: https://github.com/CHANSIK-CHOI
- Velog: https://velog.io/@ckstlr0828/posts
- Email: ccsik0828@gmail.com
