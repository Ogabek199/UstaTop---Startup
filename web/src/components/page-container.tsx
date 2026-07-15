import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function PageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-6xl px-5 md:px-8",
        className,
      )}
      {...props}
    />
  );
}
