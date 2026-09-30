export type CsvValue = string | number | Date | null | undefined;

const UTF8_BOM = "\uFEFF";

const LINE_BREAK = "\r\n";

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

function toCellText(value: CsvValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return FORMULA_TRIGGERS.some((trigger) => value.startsWith(trigger))
    ? `'${value}`
    : value;
}

function escapeCell(value: CsvValue): string {
  const text = toCellText(value);

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly CsvValue[][],
): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));

  return UTF8_BOM + lines.join(LINE_BREAK) + LINE_BREAK;
}
