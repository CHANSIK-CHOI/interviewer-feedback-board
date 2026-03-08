# 인터뷰어 피드백 보드 (Next.js Page Router + Supabase)

> 권한 기반 승인 워크플로우(작성 → 검토 → 공개)를 구현한 포트폴리오 프로젝트

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3fcf8e?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 1) 프로젝트 소개

이 프로젝트는 인터뷰어 피드백을 작성하고, 관리자가 검토 후 공개하는 **권한 기반 피드백 보드**입니다.

- **핵심 목표**
  - 단순 CRUD를 넘어서, 실제 서비스와 유사한 **승인 프로세스**를 구현
  - 사용자/관리자 역할에 따른 **데이터 가시성 분리**
  - Next.js API Routes + Supabase를 활용한 **실무형 풀스택 구조** 구성

---

## 2) 데모

- Live: `https://<your-vercel-domain>`
- Test Account (선택):
  - Reviewer: `<email>` / `<password>`
  - Admin: `<email>` / `<password>`

> 포트폴리오 공개 시 테스트 계정이 어렵다면, GIF/스크린샷 + 시나리오로 대체해도 좋습니다.

---

## 3) 주요 기능

### 공통

- 피드백 목록 조회 / 상세 조회
- 최신순/오래된순 정렬
- 프로필/아바타 반영

### Reviewer

- 피드백 작성
- 본인 피드백 수정
- 본인 글의 pending / revised_pending 상태 확인

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
    ├─ /api/feedbacks/*
    └─ /api/avatar/*

[Supabase]
    ├─ auth.users
    ├─ user_roles
    └─ feedbacks
```
