import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white shadow-md shadow-accent/25 hover:bg-accent/90",
        secondary: "border-2 border-accent text-accent bg-white hover:bg-accent-soft",
        ghost: "text-accent hover:bg-accent-soft",
        danger: "bg-error text-white hover:bg-error/90",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-12 px-6 text-base min-h-12",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
