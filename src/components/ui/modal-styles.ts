import { cn } from "@/lib/utils";

/**
 * One look for every modal in the app. Older screens passed their own corner,
 * shadow, dark mode and grey text classes, so those are dropped here and every
 * modal ends up with the same SportCliq style.
 */
const LEGACY = [
  /^dark:/,
  /^sm:rounded(-\w+)?$/,
  /^rounded(-(none|sm|md|lg|xl|2xl|3xl))?$/,
  /^shadow(-(sm|md|lg|xl|2xl|card))?$/,
  /^border(-gray-\d+)?$/,
];
const LEGACY_TEXT = [/^dark:/, /^text-(gray|slate|zinc|neutral)-\d+$/, /^text-muted-foreground$/];
// Old titles set their own size, weight and green or grey colour
const LEGACY_TITLE = [...LEGACY_TEXT, /^text-(sm|base|lg|xl|2xl|3xl)$/, /^font-(medium|semibold|bold)$/, /^text-(green|emerald)-\d+$/, /^text-sc-green-dark$/];

const strip = (cls: string | undefined, rules: RegExp[]) =>
  (cls || "").split(/\s+/).filter((c) => c && !rules.some((r) => r.test(c))).join(" ");

export const modalOverlay =
  "fixed inset-0 z-50 bg-[#0E1411]/50 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const modalContent = (className?: string) =>
  cn(
    "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] translate-x-[-50%] translate-y-[-50%] gap-4 border-0 bg-white p-6 font-sans text-sc-ink",
    "rounded-[28px] shadow-[0_24px_60px_-12px_rgba(14,20,17,0.35)] max-h-[90dvh] overflow-y-auto overscroll-contain",
    "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-[0.97] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[46%]",
    strip(className, LEGACY),
  );

export const modalClose =
  "absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-sc-ink transition active:scale-95 hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-sc-green disabled:pointer-events-none";

export const modalHeader = (className?: string) =>
  cn("flex flex-col gap-1.5 text-left pr-8", className);

export const modalFooter = (className?: string) =>
  cn(
    "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto [&>button]:h-12 [&>button]:rounded-full [&>button]:font-bold",
    strip(className, [/^sm:space-x-\d+$/, /^space-x-\d+$/]),
  );

export const modalTitle = (className?: string) =>
  cn("text-[21px] font-extrabold leading-tight tracking-[-0.02em] text-sc-ink", strip(className, LEGACY_TITLE));

export const modalDescription = (className?: string) =>
  cn("text-[15px] leading-relaxed text-sc-ink3", strip(className, LEGACY_TEXT));

export const modalAction =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sc-ink px-6 text-[15px] font-bold text-white transition active:scale-[0.98] hover:bg-sc-ink/90 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sc-green";

export const modalCancel =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-6 text-[15px] font-bold text-sc-ink transition active:scale-[0.98] hover:bg-black/[0.08] disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sc-green";
