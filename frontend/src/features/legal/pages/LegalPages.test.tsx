import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";

import { LegalNoticePage } from "./LegalNoticePage";
import { PrivacyPolicyPage } from "./PrivacyPolicyPage";

describe("legal pages", () => {
  it("privacy policy explains the user's rights and links to the CNIL", () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy policy" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Your rights" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Cookies" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "www.cnil.fr" }).getAttribute("href"),
    ).toBe("https://www.cnil.fr/fr/plaintes");
  });

  it("legal notice names the publisher and the host", () => {
    render(
      <MemoryRouter>
        <LegalNoticePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Legal notice" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Publisher" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hosting" })).toBeTruthy();
    for (const link of screen.getAllByRole("link", {
      name: "Privacy policy",
    })) {
      expect(link.getAttribute("href")).toBe("/privacy");
    }
  });
});
