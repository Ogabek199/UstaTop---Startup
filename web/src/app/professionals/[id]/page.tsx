"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Ban, CalendarCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { StarRating } from "@/components/pro-card";
import {
  ProfessionalPageSkeleton,
  ReviewListSkeleton,
} from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/i18n/provider";
import { getProfessional } from "@/lib/data";
import { api, type MasterProfile, type PaginationMeta, type Review } from "@/lib/api";
import { PageContainer } from "@/components/page-container";
import { StickyActionBar } from "@/components/sticky-action-bar";
import { formatPrice } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import {
  ListPagination,
  PAGE_SIZE as REVIEWS_PAGE_SIZE,
} from "@/components/list-pagination";

export default function ProfessionalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [pro, setPro] = useState<MasterProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsMeta, setReviewsMeta] = useState<PaginationMeta | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const loadReviews = useCallback(async (userId: string, page: number) => {
    setReviewsLoading(true);
    try {
      const { items, meta } = await api.getProfessionalReviews(userId, {
        page,
        limit: REVIEWS_PAGE_SIZE,
      });
      setReviews(items);
      setReviewsMeta(meta);
    } catch {
      setReviews([]);
      setReviewsMeta(null);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    setReviewsPage(1);
    getProfessional(id)
      .then((p) => setPro(p))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!pro) return;
    loadReviews(pro.userId, reviewsPage);
  }, [pro, reviewsPage, loadReviews]);

  const handleReviewsPageChange = (page: number) => {
    setReviewsPage(page);
  };

  if (loading) return <ProfessionalPageSkeleton />;

  if (!pro) {
    return (
      <div className="min-h-screen pb-nav">
        <PageContainer className="py-5">
          <Link href="/" className="inline-flex gap-2 text-primary mb-4">
            <ArrowLeft className="h-5 w-5" /> {t.back}
          </Link>
          <EmptyState
            icon="users"
            title={t.proNotFound}
            action={{ label: t.findPro, href: "/" }}
            variant="card"
          />
        </PageContainer>
      </div>
    );
  }

  const isBlocked = pro.user.isVerified === false;

  return (
    <div className="min-h-screen pb-action">
      <div className="bg-gradient-to-br from-primary to-accent pt-5 pb-16">
        <PageContainer>
          <Link href="/" className="inline-flex text-white/90 mb-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4 md:gap-6">
            <UserAvatar
              name={pro.user.name}
              avatarUrl={pro.user.avatarUrl}
              size="xl"
              className="border-2 border-white/40 bg-white/20 text-white"
            />
            <div className="text-white">
              <h1 className="text-xl md:text-2xl font-bold">{pro.user.name}</h1>
              <p className="text-white/80 text-sm md:text-base">{pro.district}</p>
              {isBlocked ? (
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-100">
                  <Ban className="h-4 w-4" /> {t.blocked}
                </span>
              ) : (
                pro.isApproved && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-green-200">
                    <BadgeCheck className="h-4 w-4" /> {t.verified}
                  </span>
                )
              )}
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="-mt-8 space-y-4">
        {isBlocked && (
          <Card className="border-error/25 shadow-md">
            <CardBody className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
                <Ban className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-error">{t.professionalBlocked}</p>
                <p className="mt-1 text-sm text-error/80">
                  {t.professionalBlockedDesc}
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="shadow-md">
          <CardBody className="flex justify-between items-center">
            <StarRating
              rating={pro.ratingAvg}
              count={pro.reviewCount}
              reviewsLabel={t.reviews}
            />
            <div className="text-right text-sm text-muted">
              <p>{pro.completedOrders} {t.orders}</p>
              <p>{pro.experienceYears} {t.years} {t.experience}</p>
            </div>
          </CardBody>
        </Card>

        {pro.bio && (
          <Card>
            <CardBody>
              <p className="text-sm text-muted leading-relaxed">{pro.bio}</p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <Phone className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted">{t.phone}</p>
              <a
                href={`tel:${pro.user.phone}`}
                className="text-lg font-semibold text-primary hover:text-accent transition"
              >
                {formatPhoneDisplay(pro.user.phone)}
              </a>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-muted mb-1">{t.from}</p>
            <p className="text-xl font-bold text-primary">
              {formatPrice(pro.priceMin, locale)} so&apos;m
            </p>
          </CardBody>
        </Card>

        <section>
          <h2 className="font-bold text-primary mb-3">{t.reviews}</h2>
          {reviewsLoading ? (
            <ReviewListSkeleton count={2} />
          ) : reviews.length === 0 ? (
            <EmptyState icon="star" title={t.noReviewsYet} variant="card" />
          ) : (
            <>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <Card key={r.id}>
                    <CardBody>
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={r.rating} />
                        <span className="text-xs text-muted">
                          {r.order?.client?.name}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted">{r.comment}</p>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
              {reviewsMeta && (
                <ListPagination
                  page={reviewsMeta.page}
                  totalPages={reviewsMeta.totalPages}
                  total={reviewsMeta.total}
                  pageSize={reviewsMeta.limit}
                  onPageChange={handleReviewsPageChange}
                  labels={{ prev: t.prevPage, next: t.nextPage }}
                />
              )}
            </>
          )}
        </section>
      </PageContainer>

      <StickyActionBar>
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-col justify-center rounded-xl border border-accent/10 bg-gradient-to-br from-accent-soft to-white px-3.5 py-2.5 md:px-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {t.from}
            </span>
            <p className="mt-0.5 text-lg font-bold tabular-nums leading-none text-primary md:text-xl">
              {formatPrice(pro.priceMin, locale)}
              <span className="ml-1 text-xs font-semibold text-muted md:text-sm">
                so&apos;m
              </span>
            </p>
          </div>
          <Button
            size="lg"
            disabled={isBlocked}
            className="ml-auto min-h-12 shrink-0 gap-1.5 whitespace-nowrap px-4 shadow-lg shadow-accent/25 md:px-5"
            onClick={() =>
              router.push(`/book/${pro.userId}?priceMin=${pro.priceMin}`)
            }
          >
            {isBlocked ? (
              <>
                <Ban className="h-4 w-4 shrink-0" />
                {t.bookingUnavailable}
              </>
            ) : (
              <>
                <CalendarCheck className="h-4 w-4 shrink-0" />
                {t.bookNow}
              </>
            )}
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}
