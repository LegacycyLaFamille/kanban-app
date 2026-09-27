import { describe, it, expect } from "vitest";
import { toCsv } from "../../../shared/export/csv.js";

const BOM = "\uFEFF";

describe("toCsv", () => {
  it("prefixe le BOM UTF-8 et termine chaque ligne par CRLF", () => {
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe(`${BOM}a,b\r\n1,2\r\n`);
  });

  it("échappe les virgules, guillemets et retours à la ligne", () => {
    const csv = toCsv(["value"], [["a,b"], ['say "hi"'], ["multi\nline"]]);

    expect(csv).toBe(
      `${BOM}value\r\n"a,b"\r\n"say ""hi"""\r\n"multi\nline"\r\n`,
    );
  });

  it("neutralise les cellules interprétables comme formules", () => {
    const csv = toCsv(
      ["value"],
      [["=SUM(A1)"], ["+1"], ["-cmd"], ["@import"], ["safe"]],
    );

    expect(csv.split("\r\n").slice(1, 6)).toEqual([
      "'=SUM(A1)",
      "'+1",
      "'-cmd",
      "'@import",
      "safe",
    ]);
  });

  it("formate dates, nombres et valeurs vides", () => {
    const date = new Date("2026-09-01T10:00:00.000Z");

    expect(toCsv(["d", "n", "e", "u"], [[date, -3, null, undefined]])).toBe(
      `${BOM}d,n,e,u\r\n2026-09-01T10:00:00.000Z,-3,,\r\n`,
    );
  });

  it("conserve les caractères accentués", () => {
    expect(toCsv(["name"], [["Café Ünïcode"]])).toContain("Café Ünïcode");
  });
});
