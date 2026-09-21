import { useEffect, useState, type InputHTMLAttributes } from "react";
import { formatNumberDraft, parseNumberDraft, sanitizeNumberTyping } from "../lib/numberInput";

type NumberFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** When true, clearing the field yields null instead of 0. */
  nullable?: boolean;
  allowDecimal?: boolean;
  allowNegative?: boolean;
};

/**
 * Controlled number input that lets the user clear a prefilled 0 while typing.
 * Parent receives a number (or null if nullable) after each change; empty draft maps to 0 or null.
 */
export function NumberField({
  value,
  onChange,
  nullable = false,
  allowDecimal = true,
  allowNegative = false,
  onBlur,
  ...rest
}: NumberFieldProps) {
  const emptyResult = nullable ? null : 0;
  const [draft, setDraft] = useState(() => formatNumberDraft(value));

  useEffect(() => {
    const parsed = parseNumberDraft(draft, emptyResult);
    const external = value === undefined ? emptyResult : value;
    if (parsed !== external) {
      setDraft(formatNumberDraft(value));
    }
    // Sync only when parent value changes from outside (e.g. open edit form).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={draft}
      onChange={(e) => {
        const next = sanitizeNumberTyping(e.target.value, allowDecimal, allowNegative);
        setDraft(next);
        onChange(parseNumberDraft(next, emptyResult));
      }}
      onBlur={(e) => {
        const parsed = parseNumberDraft(draft, emptyResult);
        setDraft(formatNumberDraft(parsed));
        onChange(parsed);
        onBlur?.(e);
      }}
    />
  );
}
