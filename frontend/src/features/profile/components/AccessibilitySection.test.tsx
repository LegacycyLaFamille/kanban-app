import { afterEach, describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import { AccessibilitySection } from "./AccessibilitySection";

function renderSection() {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <AccessibilitySection />
    </Reshaped>,
  );
}

describe("AccessibilitySection", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-color-vision");
  });

  it("switches the app to the colour-blind palette and remembers it", async () => {
    const user = userEvent.setup();
    renderSection();

    expect(screen.getByRole("radio", { name: /Standard/ })).toHaveProperty(
      "checked",
      true,
    );

    await user.click(
      screen.getByRole("radio", { name: /Colour-blind friendly/ }),
    );

    expect(document.documentElement.getAttribute("data-color-vision")).toBe(
      "colorblind",
    );
    expect(localStorage.getItem("kanban.colorVision")).toBe("colorblind");
  });

  it("starts from the saved preference", () => {
    localStorage.setItem("kanban.colorVision", "colorblind");
    renderSection();

    expect(
      screen.getByRole("radio", { name: /Colour-blind friendly/ }),
    ).toHaveProperty("checked", true);
  });

  it("previews every priority", () => {
    renderSection();

    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
  });
});
