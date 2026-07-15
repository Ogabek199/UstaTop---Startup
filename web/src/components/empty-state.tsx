import Link from "next/link";
import {
  AlertCircle,
  ClipboardList,
  HardHat,
  Search,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type EmptyStateVariant = "default" | "card" | "compact";

export type EmptyStateIcon =
  | "clipboard"
  | "search"
  | "star"
  | "users"
  | "alert"
  | "construction";

const ICONS: Record<EmptyStateIcon, LucideIcon> = {
  clipboard: ClipboardList,
  search: Search,
  star: Star,
  users: Users,
  alert: AlertCircle,
  construction: HardHat,
};

interface EmptyStateAction {
  label: string;
  href: string;
}

interface EmptyStateProps {
  icon?: EmptyStateIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  variant?: EmptyStateVariant;
  className?: string;
}

function EmptyStateIconCircle({
  icon,
  size = "lg",
}: {
  icon: EmptyStateIcon;
  size?: "sm" | "lg";
}) {
  const Icon = ICONS[icon];
  const isLarge = size === "lg";

  return (
    <div
      className={cn(
        "mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-accent/10 ring-1 ring-accent/15",
        isLarge ? "h-16 w-16 mb-4" : "h-9 w-9 mb-2",
      )}
    >
      <Icon
        className={cn("text-accent", isLarge ? "h-7 w-7" : "h-4 w-4")}
        strokeWidth={isLarge ? 1.5 : 2}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const isCompact = variant === "compact";

  const content = (
    <>
      {icon && <EmptyStateIconCircle icon={icon} size={isCompact ? "sm" : "lg"} />}
      <p
        className={cn(
          "text-primary",
          isCompact ? "text-sm" : "text-base font-semibold",
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "text-muted max-w-xs mx-auto",
            isCompact ? "text-xs mt-1" : "text-sm mt-1.5",
          )}
        >
          {description}
        </p>
      )}
      {action && !isCompact && (
        <Link href={action.href} className="mt-5 inline-block">
          <Button variant="secondary" size="sm">
            {action.label}
          </Button>
        </Link>
      )}
      {action && isCompact && (
        <Link
          href={action.href}
          className="mt-2 inline-block text-sm text-accent font-semibold hover:underline"
        >
          {action.label}
        </Link>
      )}
    </>
  );

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/80 bg-accent-soft/30 px-4 py-5 text-center",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  const card = (
    <Card
      className={cn(
        "border-dashed border-accent/25 bg-white/80 shadow-none",
        className,
      )}
    >
      <CardBody className="py-12 md:py-14 text-center">{content}</CardBody>
    </Card>
  );

  if (variant === "card") {
    return card;
  }

  return card;
}
