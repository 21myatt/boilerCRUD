import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, ...props }: InputProps) => (
  <input
    className={cn(
      "w-full rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(28,23,20,0.34)] focus:shadow-[0_0_0_4px_rgba(28,23,20,0.08)]",
      className
    )}
    {...props}
  />
);
