import * as React from "react"

import { cn } from "@/lib/utils"

type Mode = React.HTMLAttributes<HTMLInputElement>["inputMode"]

const PHONE = /(phone|whatsapp|mobile|tel\b|11-digit)/i
const DECIMAL = /(amount|price|fee|cost|₦|naira|0\.00|200\.00|distance|\bkm\b)/i
const NUMERIC = /(digit|account number|acct|super ?code|check-?in code|confirmation|6-digit code|enter code|\botp\b|\bpin\b|score|goals?|occurrences|number of|max(imum)? (number|players|tickets)|capacity|quantity|\bage\b|jersey|slots?)/i
const TEXTY = /(character|e\.g\.|time|:\d\d|name|email|address|search)/i

/**
 * Picks the right mobile keypad so phone numbers, scores, codes and amounts
 * open the number pad on phones. An explicit inputMode always wins.
 */
export function inferInputMode(
  type: string | undefined,
  hint: string,
): { inputMode?: Mode } {
  if (type === "tel") return { inputMode: "tel" }
  if (type === "email" || type === "url" || type === "password" || type === "search") return {}
  if (type === "number") {
    return DECIMAL.test(hint) ? { inputMode: "decimal" } : { inputMode: "numeric" }
  }
  if (type && type !== "text") return {}
  if (!hint) return {}
  if (PHONE.test(hint)) return { inputMode: "tel" }
  if (TEXTY.test(hint)) return {}
  if (DECIMAL.test(hint)) return { inputMode: "decimal" }
  if (NUMERIC.test(hint)) return { inputMode: "numeric" }
  return {}
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, pattern, ...props }, ref) => {
    const hint = [props.name, props.id, props.placeholder, props.autoComplete, props["aria-label"]]
      .filter(Boolean)
      .join(" ")
    const auto = inputMode ? {} : inferInputMode(type, hint)
    return (
      <input
        type={type}
        inputMode={inputMode ?? auto.inputMode}
        pattern={pattern}
        autoComplete={props.autoComplete ?? (auto.inputMode === "tel" ? "tel" : undefined)}
        className={cn(
          "flex h-[52px] w-full rounded-2xl border border-sc-line bg-white px-4 py-2 text-base text-sc-ink ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-green/40 focus-visible:border-sc-green focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
