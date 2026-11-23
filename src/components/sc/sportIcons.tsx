import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

// Lucide has no horse or padel icons, so these follow the same props and stroke style.
const make = (name: string, children: React.ReactNode) => {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(({ size = 24, color = "currentColor", strokeWidth = 2, className, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  ));
  Icon.displayName = name;
  return Icon as unknown as LucideIcon;
};

export const HorseIcon = make(
  "HorseIcon",
  <>
    <path d="M5 22v-6c0-5 2-8.5 5-10.5V2l2.2 2.2C16 4.5 19 7.5 20.3 11.3l.6 2a1.8 1.8 0 0 1-2.4 2.2L16 14.6l-3 2.4V22" />
    <path d="M10 5.5c-1.6 1.8-2.6 4.2-2.9 7" />
    <circle cx="15" cy="8.6" r="0.9" fill="currentColor" stroke="none" />
  </>
);

export const PadelIcon = make(
  "PadelIcon",
  <>
    <circle cx="14" cy="9" r="6.2" />
    <path d="m9.6 13.4-1.4 1.4" />
    <path d="m8.2 14.8-4.4 4.4a1.4 1.4 0 0 0 2 2l4.4-4.4" />
    <circle cx="12.3" cy="7.3" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="15.7" cy="7.3" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="14" cy="10.6" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="20" cy="19" r="1.8" />
  </>
);
