import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/get-current-user";

export type { CurrentUser };

export class ForbiddenError extends Error {
  constructor() {
    super("This action requires an admin role.");
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new ForbiddenError();
  }
  return user;
}
