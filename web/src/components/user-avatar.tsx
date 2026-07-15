import { cn } from "@/lib/utils";

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const initials = getInitials(name);

  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-lg",
    lg: "h-16 w-16 text-xl",
    xl: "h-20 w-20 md:h-24 md:w-24 text-2xl md:text-3xl",
  };

  const baseClass = cn(
    "relative shrink-0 overflow-hidden rounded-full flex items-center justify-center font-bold",
    sizeClasses[size],
    className,
  );

  if (avatarUrl) {
    return (
      <div className={baseClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name ?? "Avatar"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseClass,
        "bg-gradient-to-br from-primary to-accent text-white",
      )}
    >
      {initials}
    </div>
  );
}

export { getInitials };
