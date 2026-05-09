import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ElementProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: ElementProps) => (
  <div
    className={cn(
      "rounded-[18px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] backdrop-blur-[12px]",
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: ElementProps) => (
  <div className={cn("grid gap-1 p-0", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("m-0 text-base leading-[1.35] tracking-[-0.03em]", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("m-0 leading-[1.5] text-[var(--muted)]", className)} {...props} />
);

export const CardContent = ({ className, ...props }: ElementProps) => (
  <div className={cn("p-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: ElementProps) => (
  <div className={cn("p-0", className)} {...props} />
);
