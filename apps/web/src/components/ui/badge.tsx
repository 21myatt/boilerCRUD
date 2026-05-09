import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline";
};

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]",
      variant === "default" && "bg-[#1f1915] text-[#fff7ef]",
      variant === "secondary" && "bg-[#ecdcc9] text-[#4f3c2d]",
      variant === "outline" && "border border-[rgba(71,57,47,0.14)] bg-[rgba(255,255,255,0.58)] text-[#47392f]",
      className
    )}
    {...props}
  />
);
