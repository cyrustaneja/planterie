import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CurrentUser } from "@/lib/get-current-user";

vi.mock("@/lib/get-current-user", () => ({
  getCurrentUser: vi.fn(),
}));

const { getCurrentUser } = await import("@/lib/get-current-user");
const { requireUser, requireAdmin, ForbiddenError } = await import("@/lib/auth");

const adminUser: CurrentUser = { id: "admin-1", email: "admin@planterie.in", role: "admin" };
const memberUser: CurrentUser = { id: "member-1", email: "member@planterie.in", role: "member" };

describe("requireUser", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("returns the current user when signed in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(memberUser);
    await expect(requireUser()).resolves.toEqual(memberUser);
  });

  it("redirects to /login when there is no session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow(/NEXT_REDIRECT/);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("returns the current user when they are an admin", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
    await expect(requireAdmin()).resolves.toEqual(adminUser);
  });

  it("throws ForbiddenError for a signed-in member", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(memberUser);
    await expect(requireAdmin()).rejects.toThrow(ForbiddenError);
  });

  it("redirects to /login rather than throwing Forbidden when signed out", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow(/NEXT_REDIRECT/);
  });
});
