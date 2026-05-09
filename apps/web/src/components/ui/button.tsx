import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "destructive" | "ghost";
  size?: "default" | "sm";
};

export const Button = ({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-bold tracking-[-0.01em] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
      size === "default" && "px-4 py-3",
      size === "sm" && "rounded-[10px] px-3.5 py-2.5 text-sm",
      variant === "default" && "bg-[linear-gradient(180deg,#2a2420_0%,#151210_100%)] text-[#fffdf9] shadow-[0_8px_18px_rgba(21,18,16,0.14)]",
      variant === "secondary" && "bg-[var(--accent-soft)] text-[var(--text)]",
      variant === "destructive" && "bg-[linear-gradient(180deg,#b54b3d_0%,#912f22_100%)] text-[#fffaf8]",
      variant === "ghost" && "bg-transparent text-[var(--text)] shadow-none hover:bg-black/4",
      className
    )}
    {...props}
  />
);
