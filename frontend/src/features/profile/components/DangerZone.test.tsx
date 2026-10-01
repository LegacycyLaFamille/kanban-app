import { describe, expect, it, vi } from "vitest";

import { render, screen, waitFor, within } from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import { Reshaped } from "reshaped";

import { ApiError } from "../../../shared/api";

import { DangerZone } from "./DangerZone";

const EMAIL = "jane@example.com";

function renderDangerZone(
  props: Partial<Parameters<typeof DangerZone>[0]> = {},
) {
  render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <DangerZone email={EMAIL} {...props} />
    </Reshaped>,
  );
}

describe("DangerZone", () => {
  describe("change password", () => {
    async function submitPasswordChange() {
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Change password" }));

      const dialog = await screen.findByRole("dialog");

      await user.type(
        within(dialog).getByLabelText("Current password"),
        "old-password",
      );
      await user.type(
        within(dialog).getByLabelText("New password"),
        "new-password",
      );
      await user.type(
        within(dialog).getByLabelText("Confirm new password"),
        "new-password",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Update password" }),
      );

      return dialog;
    }

    it("sends the current and new passwords", async () => {
      const onChangePassword = vi.fn().mockResolvedValue(undefined);

      renderDangerZone({ onChangePassword });

      await submitPasswordChange();

      expect(onChangePassword).toHaveBeenCalledWith({
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      });
    });

    it("flags the current password when the backend rejects it", async () => {
      const onChangePassword = vi
        .fn()
        .mockRejectedValue(
          new ApiError(400, "INVALID_CURRENT_PASSWORD", "Incorrect"),
        );

      renderDangerZone({ onChangePassword });

      const dialog = await submitPasswordChange();

      expect(
        await within(dialog).findByText("The current password is incorrect."),
      ).toBeTruthy();
    });

    it("shows a generic error on any other failure", async () => {
      const onChangePassword = vi.fn().mockRejectedValue(new Error("down"));

      renderDangerZone({ onChangePassword });

      const dialog = await submitPasswordChange();

      expect(
        await within(dialog).findByText(
          "Unable to update your password. Please try again.",
        ),
      ).toBeTruthy();
    });
  });

  describe("delete account", () => {
    async function confirmDeletion() {
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Delete account" }));

      const dialog = await screen.findByRole("dialog");

      await user.type(within(dialog).getByRole("textbox"), EMAIL);
      await user.click(
        within(dialog).getByRole("button", { name: "Delete my account" }),
      );

      return dialog;
    }

    it("deletes the account once the email is typed", async () => {
      const onDeleteAccount = vi.fn().mockResolvedValue(undefined);

      renderDangerZone({ onDeleteAccount });

      await confirmDeletion();

      await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledTimes(1));
    });

    it("keeps the dialog open with an error when deletion fails", async () => {
      const onDeleteAccount = vi.fn().mockRejectedValue(new Error("down"));

      renderDangerZone({ onDeleteAccount });

      const dialog = await confirmDeletion();

      expect((await within(dialog).findByRole("alert")).textContent).toBe(
        "Unable to delete your account. Please try again.",
      );
    });
  });
});
