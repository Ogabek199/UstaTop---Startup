"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProCard } from "@/components/pro-card";
import { ProCardListSkeleton } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { getServices, getProfessionals } from "@/lib/data";
import { MOCK_DISTRICTS } from "@/lib/mock-data";
import type { MasterProfile, Service } from "@/lib/api";
import { serviceName } from "@/i18n";

export default function ServicesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const categoryId = params.id as string;
  const q = searchParams.get("q") ?? "";
  const { t, locale } = useI18n();

  const [pros, setPros] = useState<MasterProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState(q);

  const title =
    categoryId === "all"
      ? t.all
      : services.find((s) => s.id === categoryId)
        ? serviceName(services.find((s) => s.id === categoryId)!, locale)
        : t.categories;

  useEffect(() => {
    getServices().then(setServices);
  }, []);

  useEffect(() => {
    setLoading(true);
    const query: Record<string, string | number | undefined> = {
      limit: 20,
      q: search || undefined,
      district: district || undefined,
    };
    if (categoryId !== "all") query.category = categoryId;

    getProfessionals(query)
      .then(setPros)
      .finally(() => setLoading(false));
  }, [categoryId, district, search]);

  return (
    <div className="min-h-screen pb-nav">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <PageContainer className="flex items-center gap-3 py-4">
          <Link href="/" className="text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-primary">{title}</h1>
        </PageContainer>
        <PageContainer className="space-y-3 pb-4">
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setDistrict("")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                !district
                  ? "bg-accent text-white border-accent"
                  : "bg-white border-border text-muted"
              }`}
            >
              {t.all}
            </button>
            {MOCK_DISTRICTS.map((d) => (
              <button
                key={d}
                onClick={() => setDistrict(d)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                  district === d
                    ? "bg-accent text-white border-accent"
                    : "bg-white border-border text-muted"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </PageContainer>
      </div>

      <PageContainer className="space-y-3 py-4 md:py-6">
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
          {loading ? (
            <ProCardListSkeleton count={6} className="col-span-full" />
          ) : pros.length === 0 ? (
            <EmptyState
              icon="search"
              title={t.noResults}
              className="col-span-full"
            />
          ) : (
            pros.map((pro) => (
              <ProCard
                key={pro.id}
                pro={pro}
                href={`/professionals/${pro.userId}`}
                verifiedLabel={t.verified}
                fromLabel={t.from}
                locale={locale}
              />
            ))
          )}
        </div>
      </PageContainer>
    </div>
  );
}
