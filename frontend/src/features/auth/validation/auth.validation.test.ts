import { describe, expect, it } from "vitest";

import {
  hasAuthErrors,
  validateLogin,
  validateRegister,
} from "./auth.validation";

describe("auth validation", () => {
  describe("validateLogin", () => {
    it("accepts valid login values", () => {
      const errors = validateLogin({
        email: "user@example.com",
        password: "password123",
      });

      expect(errors).toEqual({});
    });

    it("rejects an invalid email", () => {
      const errors = validateLogin({
        email: "invalid-email",
        password: "password123",
      });

      expect(errors.email).toBeDefined();
    });

    it("requires a password", () => {
      const errors = validateLogin({
        email: "user@example.com",
        password: "",
      });

      expect(errors.password).toBeDefined();
    });
  });

  describe("validateRegister", () => {
    it("accepts valid registration values", () => {
      const errors = validateRegister({
        name: "Mathis",
        email: "mathis@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(errors).toEqual({});
    });

    it("requires a name", () => {
      const errors = validateRegister({
        name: "",
        email: "mathis@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(errors.name).toBeDefined();
    });

    it("rejects short passwords", () => {
      const errors = validateRegister({
        name: "Mathis",
        email: "mathis@example.com",
        password: "123",
        confirmPassword: "123",
      });

      expect(errors.password).toBeDefined();
    });

    it("rejects different passwords", () => {
      const errors = validateRegister({
        name: "Mathis",
        email: "mathis@example.com",
        password: "password123",
        confirmPassword: "different123",
      });

      expect(errors.confirmPassword).toBe("Passwords do not match.");
    });
  });

  describe("hasAuthErrors", () => {
    it("returns false with no errors", () => {
      expect(hasAuthErrors({})).toBe(false);
    });

    it("returns true when an error exists", () => {
      expect(
        hasAuthErrors({
          email: "Invalid email",
        }),
      ).toBe(true);
    });
  });
});
