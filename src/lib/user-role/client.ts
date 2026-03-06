import { ApiResponse } from "@/types/common";
import type { UserRole } from "@/types/user-role";

export type SyncUserRoleResult = {
  role: UserRole["role"];
  isNewUser: boolean;
};

type UserRoleSyncResponse = ApiResponse<{ role: UserRole["role"]; isNewUser: boolean }>;

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

  const { data, error }: UserRoleSyncResponse = await response
    .json()
    .catch(() => ({ data: null, error: "Invalid response" }));

  if (!response.ok || error || !data || !data.role) {
    throw new Error(error ?? "Failed Post user roles");
  }

  return {
    role: data.role,
    isNewUser: data.isNewUser,
  };
}
