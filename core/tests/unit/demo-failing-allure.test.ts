import { describe, expect, it } from "@jest/globals";

describe("Demo Intentional Failing Tests for Allure Action Verification", () => {
  it("should fail with math assertion mismatch to verify Allure report output", () => {
    const expectedValue = 100;
    const actualValue = 42;
    expect(actualValue).toBe(expectedValue);
  });

  it("should fail with object mismatch to verify Allure report diff rendering", () => {
    const expectedObject = { status: "SUCCESS", count: 10, items: ["note-1", "note-2"] };
    const actualObject = { status: "FAILED", count: 0, items: [] };
    expect(actualObject).toEqual(expectedObject);
  });
});
