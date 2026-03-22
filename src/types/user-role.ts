export type UserRole = {
  user_id: string;
  role: "admin" | "reviewer";
  created_at?: string;
};
