import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-xl border border-border bg-white px-4 text-base text-foreground placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
