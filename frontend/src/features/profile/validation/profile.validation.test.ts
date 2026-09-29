import { describe, expect, it } from "vitest";

import {
  hasErrors,
  validateChangePassword,
  validateProfile,
} from "./profile.validation";

describe("validateProfile", () => {
  it("accepts a valid name and email", () => {
    expect(
      validateProfile({ name: "Jane Doe", email: "jane@example.com" }),
    ).toEqual({});
  });

  it("requires a name of at least 2 characters", () => {
    expect(validateProfile({ name: "  ", email: "a@b.co" }).name).toBe(
      "Name is required.",
    );
    expect(validateProfile({ name: "J", email: "a@b.co" }).name).toMatch(
      /at least 2/,
    );
  });

  it("rejects names longer than 100 characters", () => {
    expect(
      validateProfile({ name: "a".repeat(101), email: "a@b.co" }).name,
    ).toMatch(/at most 100/);
  });

  it("requires a valid email", () => {
    expect(validateProfile({ name: "Jane", email: "" }).email).toBe(
      "Email is required.",
    );
    expect(validateProfile({ name: "Jane", email: "jane@" }).email).toBe(
      "Please enter a valid email address.",
    );
  });
});

describe("validateChangePassword", () => {
  const valid = {
    currentPassword: "old-password",
    newPassword: "new-password",
    confirmPassword: "new-password",
  };

  it("accepts a valid password change", () => {
    expect(hasErrors(validateChangePassword(valid))).toBe(false);
  });

  it("requires every field", () => {
    const errors = validateChangePassword({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    expect(errors.currentPassword).toBeDefined();
    expect(errors.newPassword).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });

  it("enforces a minimum length and a different password", () => {
    expect(
      validateChangePassword({ ...valid, newPassword: "short" }).newPassword,
    ).toMatch(/at least 8/);
    expect(
      validateChangePassword({
        ...valid,
        newPassword: "old-password",
        confirmPassword: "old-password",
      }).newPassword,
    ).toMatch(/differ/);
  });

  it("requires the confirmation to match", () => {
    expect(
      validateChangePassword({ ...valid, confirmPassword: "other-password" })
        .confirmPassword,
    ).toBe("Passwords do not match.");
  });
});
