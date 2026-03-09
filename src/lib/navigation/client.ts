import type { NextRouter } from "next/router";

export const getSafeNextPath = (
  next: string | string[] | undefined,
  fallbackPath: string = "/"
) => {
  if (typeof next !== "string") return fallbackPath;
  if (!next.startsWith("/") || next.startsWith("//")) return fallbackPath;
  return next;
};

export const buildLoginHref = (next: string | string[] | undefined, fallbackPath: string = "/") => {
  const nextPath = getSafeNextPath(next, fallbackPath);
  return `/login?next=${encodeURIComponent(nextPath)}`;
};

/*
  checkNavigationCancelledError
  - 에러가 “실패”가 아니라 “라우팅 취소”인지 판별하는 필터
    * true가 되는 조건
    1. error.cancelled가 true
    2. 문자열 에러에 취소 관련 문구 포함
    3. 객체 에러의 message에 취소 관련 문구 포함
*/
const checkNavigationCancelledError = (error: unknown) => {
  if (!error) return false;

  if (typeof error === "string") {
    return (
      error.includes("Abort fetching component") ||
      error.includes("Loading initial props cancelled")
    );
  }

  if (typeof error === "object") {
    const routeError = error as { cancelled?: boolean; message?: string };
    if (routeError.cancelled) return true;

    if (typeof routeError.message === "string") {
      return (
        routeError.message.includes("Abort fetching component") ||
        routeError.message.includes("Loading initial props cancelled")
      );
    }
  }

  return false;
};

type NavigationMethod = "push" | "replace";

const navigateSafely = async (router: NextRouter, method: NavigationMethod, href: string) => {
  if (router.asPath === href) return true;

  try {
    return await router[method](href);
  } catch (error) {
    if (checkNavigationCancelledError(error)) return false;
    throw error;
  }
};

export const pushSafely = async (router: NextRouter, href: string) => {
  return navigateSafely(router, "push", href);
};

export const replaceSafely = async (router: NextRouter, href: string) => {
  return navigateSafely(router, "replace", href);
};
