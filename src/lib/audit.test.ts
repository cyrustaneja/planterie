import { describe, expect, it, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({ from: fromMock })),
}));

const { logAudit } = await import("@/lib/audit");

describe("logAudit", () => {
  beforeEach(() => {
    insertMock.mockReset();
    fromMock.mockClear();
  });

  it("inserts a row with the given fields", async () => {
    insertMock.mockResolvedValue({ error: null });

    await logAudit({ actor: "user-1", action: "delete", target: "asset:123" });

    expect(fromMock).toHaveBeenCalledWith("audit_log");
    expect(insertMock).toHaveBeenCalledWith({
      actor: "user-1",
      action: "delete",
      target: "asset:123",
      metadata: null,
    });
  });

  it("swallows a write failure instead of throwing", async () => {
    insertMock.mockResolvedValue({ error: { message: "db unavailable" } });

    await expect(
      logAudit({ actor: "user-1", action: "delete", target: "asset:123" }),
    ).resolves.toBeUndefined();
  });
});
