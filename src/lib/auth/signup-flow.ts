const SIGN_UP_ROLE_SYNC_SKIP_STORAGE_KEY = "signUpCompleteAndSkipRoleSync";
const SIGN_UP_ROLE_SYNC_SKIP_STORAGE_VALUE = "1";

export const markSignUpRoleSyncSkip = () => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SIGN_UP_ROLE_SYNC_SKIP_STORAGE_KEY, SIGN_UP_ROLE_SYNC_SKIP_STORAGE_VALUE);
};

export const consumeSignUpRoleSyncSkip = () => {
  if (typeof window === "undefined") return false;

  const isMarked =
    sessionStorage.getItem(SIGN_UP_ROLE_SYNC_SKIP_STORAGE_KEY) ===
    SIGN_UP_ROLE_SYNC_SKIP_STORAGE_VALUE;

  if (isMarked) {
    sessionStorage.removeItem(SIGN_UP_ROLE_SYNC_SKIP_STORAGE_KEY);
  }

  return isMarked;
};
