"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useI18n } from "@/i18n/provider";
import { serviceName } from "@/i18n";
import { api, type Review } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { ReviewListSkeleton } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { PageContainer } from "@/components/page-container";
import { formatDateTime } from "@/lib/date";
import {
  ListPagination,
  PAGE_SIZE,
} from "@/components/list-pagination";

function ReviewCard({
  review,
  locale,
  t,
}: {
  review: Review;
  locale: "uz" | "ru";
  t: { reviewFrom: string };
}) {
  const client = review.order?.client;
  const service = review.order?.service;

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={client?.name}
            avatarUrl={client?.avatarUrl}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              {t.reviewFrom}
            </p>
            <p className="font-bold text-primary text-lg leading-tight truncate">
              {client?.name ?? "—"}
            </p>
            {service && (
              <p className="text-sm text-muted mt-0.5">
                {serviceName(service, locale)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < review.rating
                      ? "fill-star text-star"
                      : "fill-border text-border"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted mt-1">
              {formatDateTime(review.createdAt, locale)}
            </p>
          </div>
        </div>
        {review.comment ? (
          <p className="text-sm text-muted leading-relaxed border-t border-border/60 pt-3">
            {review.comment}
          </p>
        ) : (
          <p className="text-sm text-muted italic border-t border-border/60 pt-3">
            —
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export default function ReviewsPage() {
  const { accessToken, user } = useAuth();
  const { isReady, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [reviewsRes, dashboard] = await Promise.all([
        api.getMyReviews(accessToken, { page, limit: PAGE_SIZE }),
        page === 1 ? api.getDashboard(accessToken) : Promise.resolve(null),
      ]);
      setReviews(reviewsRes.items);
      setTotalPages(reviewsRes.meta.totalPages);
      setTotal(reviewsRes.meta.total);
      if (dashboard) {
        setRatingAvg(Number(dashboard.profile.ratingAvg));
      }
    } catch {
      setReviews([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    if (!isReady || !accessToken) return;
    if (user?.role !== "professional") {
      router.replace("/");
      return;
    }
    load();
  }, [accessToken, user, isReady, router, load]);

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-nav bg-background">
      <div className="bg-gradient-to-br from-primary via-primary to-accent px-5 pt-6 pb-8">
        <PageContainer>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-white/90 mb-4 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
            {t.back}
          </Link>
          <h1 className="text-2xl font-bold text-white">{t.myReviews}</h1>
          {!loading && total > 0 && (
            <div className="mt-3 flex items-center gap-2 text-white">
              <Star className="h-5 w-5 fill-star text-star" />
              <span className="text-lg font-bold">{ratingAvg.toFixed(1)}</span>
              <span className="text-white/80 text-sm">
                ({total} {t.reviews})
              </span>
            </div>
          )}
        </PageContainer>
      </div>

      <PageContainer className="-mt-4 pb-6">
        {loading ? (
          <ReviewListSkeleton />
        ) : reviews.length === 0 ? (
          <EmptyState icon="clipboard" title={t.noReviewsYet} variant="card" />
        ) : (
          <>
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              labels={{ prev: t.prevPage, next: t.nextPage }}
            />
          </>
        )}
      </PageContainer>
    </div>
  );
}
