import { describe, expect, it } from "vitest";
import { getRetryDelayMs } from "@/lib/upload-queue/queue";

describe("getRetryDelayMs", () => {
  it("doubles the delay with each attempt", () => {
    expect(getRetryDelayMs(0)).toBe(1000);
    expect(getRetryDelayMs(1)).toBe(2000);
    expect(getRetryDelayMs(2)).toBe(4000);
    expect(getRetryDelayMs(3)).toBe(8000);
  });

  it("caps the delay so retries don't back off forever", () => {
    expect(getRetryDelayMs(5)).toBe(30_000);
    expect(getRetryDelayMs(10)).toBe(30_000);
  });
});
