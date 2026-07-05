// database.types.ts is generated (`npm run supabase:types`) — do not hand-edit.
// This file holds the hand-written types that layer on top of it.

export type UserRole = "admin" | "member";

export function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "member";
}
