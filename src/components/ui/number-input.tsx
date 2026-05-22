import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  /** Raw numeric string value (digits only, no formatting). Empty string = no value. */
  value: string | number | null | undefined;
  /** Called with the raw numeric string (digits only, may be empty). */
  onChange: (value: string) => void;
  /** Allow decimal values (default false). */
  allowDecimal?: boolean;
  /** Display format: 'thousands' (default) inserts non-breaking spaces every 3 digits, 'plain' = no formatting. */
  format?: "thousands" | "plain";
}

/**
 * Controlled numeric input that:
 *   - never uses native `type="number"` (avoids browser quirks like scroll-to-change, locale issues)
 *   - displays values with thin/non-breaking space thousand separators
 *   - emits the raw digit-only string via onChange
 *   - tolerates pasted values containing spaces, commas, currency symbols
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, allowDecimal = true, format = "thousands", className, inputMode, onBlur, ...rest }, ref) => {
    const raw = value == null ? "" : String(value);
    const [draft, setDraft] = React.useState<string | null>(null);
    const displayRaw = draft ?? raw;

    const formatDisplay = (v: string): string => {
      if (!v) return "";
      if (format === "plain") return v;
      const [intPart, decPart] = v.split(".");
      const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F"); // narrow no-break space
      return decPart != null ? `${grouped},${decPart}` : grouped;
    };

    const sanitize = (input: string): string => {
      // strip everything that isn't a digit (or single dot/comma for decimals)
      let cleaned = input.replace(/[^\d.,-]/g, "");
      // unify comma → dot for decimal
      cleaned = cleaned.replace(/,/g, ".");
      // remove all dots except the first if decimals allowed; otherwise drop them
      if (allowDecimal) {
        const firstDot = cleaned.indexOf(".");
        if (firstDot !== -1) {
          cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
        }
      } else {
        cleaned = cleaned.replace(/\./g, "");
      }
      return cleaned;
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode ?? (allowDecimal ? "decimal" : "numeric")}
        value={formatDisplay(displayRaw)}
        onChange={(e) => {
          const next = sanitize(e.target.value);
          setDraft(next);
          onChange(next);
        }}
        onFocus={() => setDraft(raw)}
        onBlur={(e) => {
          setDraft(null);
          onBlur?.(e);
        }}
        className={cn(className)}
        autoComplete="off"
        {...rest}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";
