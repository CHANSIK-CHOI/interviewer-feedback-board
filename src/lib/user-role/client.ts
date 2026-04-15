import type { UserRole } from "@/types/user-role";
import type { UserRoleSyncResponse } from "@/types/response";

export type SyncUserRoleResult = {
  role: UserRole["role"];
  isNewUser: boolean;
};

const parseUserRoleSyncResponse = async (response: Response): Promise<UserRoleSyncResponse> => {
  const payload: unknown = await response.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return { data: null, error: "Invalid response" };
  }

  const { data, error } = payload as { data?: unknown; error?: unknown };
  if (typeof error === "string") {
    return { data: null, error };
  }

  if (error !== null) {
    return { data: null, error: "Invalid response" };
  }

  if (!data || typeof data !== "object") {
    return { data: null, error: "Invalid response" };
  }

  const { role, isNewUser } = data as { role?: unknown; isNewUser?: unknown };
  if ((role === "admin" || role === "reviewer") && typeof isNewUser === "boolean") {
    return {
      data: {
        role,
        isNewUser,
      },
      error: null,
    };
  }

  return { data: null, error: "Invalid response" };
};

export async function syncUserRole(accessToken: string): Promise<SyncUserRoleResult> {
  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const response = await fetch("/api/user-roles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result: UserRoleSyncResponse = await parseUserRoleSyncResponse(response);

  if (result.error !== null) {
    throw new Error(result.error ?? "Failed Post user roles");
  }

  if (!response.ok || !result.data.role) {
    throw new Error("Failed Post user roles");
  }

  return {
    role: result.data.role,
    isNewUser: result.data.isNewUser,
  };
}
