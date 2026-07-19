import { describe, it, expect } from "vitest";
import { isProcessingStatus, isTerminalStatus, isHighRiskLevel } from "./report";

describe("isProcessingStatus", () => {
  it.each(["PENDING", "QUICK_SCANNING", "DEEP_SCANNING"])("%s is processing", (status) => {
    expect(isProcessingStatus(status)).toBe(true);
  });

  it.each(["DONE", "HARD_STOP", "FAILED"])("%s is not processing", (status) => {
    expect(isProcessingStatus(status)).toBe(false);
  });

  it("treats null/undefined as not processing", () => {
    expect(isProcessingStatus(null)).toBe(false);
    expect(isProcessingStatus(undefined)).toBe(false);
  });
});

describe("isTerminalStatus", () => {
  it.each(["DONE", "HARD_STOP", "FAILED"])("%s is terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(true);
  });

  it.each(["PENDING", "QUICK_SCANNING", "DEEP_SCANNING"])("%s is not terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(false);
  });
});

describe("isHighRiskLevel", () => {
  it.each(["Cao", "Nghiêm trọng"])("%s is high risk", (level) => {
    expect(isHighRiskLevel(level)).toBe(true);
  });

  it.each(["Thấp", "Trung bình", null, undefined])("%s is not high risk", (level) => {
    expect(isHighRiskLevel(level)).toBe(false);
  });
});
