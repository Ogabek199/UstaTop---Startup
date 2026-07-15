"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Header } from "@/components/header";
import { CategoryGrid, ExpressBanner } from "@/components/category-grid";
import { ProCard } from "@/components/pro-card";
import {
  CategoryGridSkeleton,
  ProCardListSkeleton,
} from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/store/auth";
import { getServices, getProfessionals } from "@/lib/data";
import type { Service, MasterProfile } from "@/lib/api";
import Link from "next/link";

export default function HomePage() {
  const { t, locale } = useI18n();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [pros, setPros] = useState<MasterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (hydrated && user?.role === "professional") {
      router.replace("/dashboard");
    }
  }, [hydrated, user, router]);

  useEffect(() => {
    if (user?.role === "professional") return;
    Promise.all([getServices(), getProfessionals({ limit: 6 })])
      .then(([svc, items]) => {
        setServices(svc);
        setPros(items);
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (hydrated && user?.role === "professional") return null;

  return (
    <div className="min-h-screen pb-nav">
      <Header />
      <main>
        <PageContainer className="space-y-6 py-5 md:py-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
            <div className="space-y-5">
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary leading-tight">
                {t.tagline}
              </p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted pointer-events-none" />
                <Input
                  className="pl-12 pr-12 shadow-sm h-12 md:h-14 text-base"
                  placeholder={t.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && search) {
                      window.location.href = `/services/all?q=${encodeURIComponent(search)}`;
                    }
                  }}
                />
                <span
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-muted/60 text-muted pointer-events-none"
                  aria-hidden="true"
                >
                  <CornerDownLeft className="h-4 w-4" />
                </span>
              </div>
            </div>
            <ExpressBanner
              title={t.expressTitle}
              desc={t.expressDesc}
              fee={t.expressFee}
            />
          </div>

          <section>
            <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-bold text-primary">
              {t.categories}
            </h2>
            {loading ? (
              <CategoryGridSkeleton />
            ) : (
              <CategoryGrid services={services} locale={locale} />
            )}
          </section>

          <section>
            <div className="mb-3 md:mb-4 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-primary">
                {t.topRated}
              </h2>
              <Link
                href="/services/all"
                className="text-sm font-semibold text-accent hover:underline"
              >
                {t.viewAll}
              </Link>
            </div>
            {loading ? (
              <ProCardListSkeleton count={4} />
            ) : pros.length === 0 ? (
              <EmptyState icon="users" title={t.noProsYet} />
            ) : (
              <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                {pros.map((pro) => (
                    <ProCard
                      key={pro.id}
                      pro={pro}
                      href={`/professionals/${pro.userId}`}
                      verifiedLabel={t.verified}
                      fromLabel={t.from}
                      locale={locale}
                    />
                ))}
              </div>
            )}
          </section>
        </PageContainer>
      </main>
    </div>
  );
}
