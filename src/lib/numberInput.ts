/** Parse a number-input draft string. Empty → emptyResult (default 0). Invalid → emptyResult. */
export function parseNumberDraft(
  raw: string,
  emptyResult: number | null = 0,
): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return emptyResult;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : emptyResult;
}

/** Format a stored number for the input display (null/undefined → ""). */
export function formatNumberDraft(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Allow only characters valid while typing a number (optional decimals / negative). */
export function sanitizeNumberTyping(raw: string, allowDecimal = true, allowNegative = false): string {
  let next = raw.replace(allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g, "");
  if (!allowDecimal) next = next.replace(/\./g, "");
  if (allowNegative) {
    const neg = next.startsWith("-");
    next = (neg ? "-" : "") + next.replace(/-/g, "");
  } else {
    next = next.replace(/-/g, "");
  }
  const parts = next.split(".");
  if (parts.length > 2) next = `${parts[0]}.${parts.slice(1).join("")}`;
  return next;
}
