import { Star, BadgeCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { MasterProfile } from "@/lib/api";
import { Card, CardBody } from "./ui/card";
import { UserAvatar } from "./user-avatar";
import Link from "next/link";

export function StarRating({
  rating,
  count,
  reviewsLabel,
}: {
  rating: number | string;
  count?: number;
  reviewsLabel?: string;
}) {
  const num = Number(rating);
  return (
    <div className="flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-star text-star" />
      <span className="font-semibold text-foreground">{num.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-muted">
          ({count} {reviewsLabel})
        </span>
      )}
    </div>
  );
}

export function ProCard({
  pro,
  href,
  verifiedLabel,
  fromLabel,
  locale = "uz",
}: {
  pro: MasterProfile;
  href: string;
  verifiedLabel: string;
  fromLabel: string;
  locale?: "uz" | "ru";
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md hover:border-accent/30 transition-all">
        <CardBody className="flex gap-3">
          <div className="relative shrink-0">
            <UserAvatar
              name={pro.user.name}
              avatarUrl={pro.user.avatarUrl}
              size="md"
            />
            {pro.isApproved && (
              <BadgeCheck className="absolute -bottom-0.5 -right-0.5 h-5 w-5 fill-success text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground truncate">
                  {pro.user.name}
                </h3>
                <p className="text-sm text-muted">{pro.district}</p>
              </div>
              {pro.isApproved && (
                <span className="shrink-0 text-xs font-medium text-success">
                  {verifiedLabel}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <StarRating rating={pro.ratingAvg} count={pro.reviewCount} />
              <span className="text-sm font-semibold text-primary">
                {fromLabel} {formatPrice(pro.priceMin, locale)} so&apos;m
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
