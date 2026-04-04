import type { UserRole } from "@/types/user-role";
import type { UserRoleSyncResponse } from "@/types/response";

export type SyncUserRoleResult = {
  role: UserRole["role"];
  isNewUser: boolean;
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

  const result: UserRoleSyncResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

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
