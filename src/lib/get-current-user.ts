import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUserRole, type UserRole } from "@/lib/supabase/types";

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", authData.user.id)
    .single();

  if (error || !profile || !isUserRole(profile.role)) {
    console.error("getCurrentUser: failed to load a valid users row", {
      userId: authData.user.id,
      message: error?.message,
      role: profile?.role,
    });
    return null;
  }

  return { id: profile.id, email: profile.email, role: profile.role };
}
