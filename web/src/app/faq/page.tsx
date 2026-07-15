"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, HelpCircle } from "lucide-react";
import { PageContainer } from "@/components/page-container";
import { Card, CardBody } from "@/components/ui/card";
import { FaqAccordion } from "@/components/faq-accordion";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/store/auth";
import { INSTAGRAM_URL, TELEGRAM_SUPPORT_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

type FaqAudience = "customer" | "professional";

function buildFaqItems(section: {
  q1: string;
  a1: string;
  q2: string;
  a2: string;
  q3: string;
  a3: string;
  q4: string;
  a4: string;
  q5: string;
  a5: string;
  q6: string;
  a6: string;
}) {
  return [
    { question: section.q1, answer: section.a1 },
    { question: section.q2, answer: section.a2 },
    { question: section.q3, answer: section.a3 },
    { question: section.q4, answer: section.a4 },
    { question: section.q5, answer: section.a5 },
    { question: section.q6, answer: section.a6 },
  ];
}

export default function FaqPage() {
  const router = useRouter();
  const { t } = useI18n();
  const user = useAuth((s) => s.user);
  const [guestTab, setGuestTab] = useState<FaqAudience>("customer");

  const isPro = user?.role === "professional";
  const audience: FaqAudience = user
    ? isPro
      ? "professional"
      : "customer"
    : guestTab;
  const faqSection =
    audience === "professional" ? t.faq.professional : t.faq.customer;
  const faqItems = buildFaqItems(faqSection);

  const backHref =
    user?.role === "professional"
      ? "/dashboard"
      : user
        ? "/profile"
        : "/";

  return (
    <div className="min-h-screen pb-nav">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <PageContainer className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="text-primary"
            aria-label={t.back}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-primary">{t.faq.title}</h1>
        </PageContainer>
      </div>

      <PageContainer className="space-y-4 py-4">
        {!user && (
          <div className="flex gap-2 rounded-xl bg-accent-soft/50 p-1">
            {(["customer", "professional"] as FaqAudience[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setGuestTab(tab)}
                className={cn(
                  "flex-1 rounded-lg py-2.5 text-sm font-semibold transition",
                  guestTab === tab
                    ? "bg-white text-accent shadow-sm"
                    : "text-muted hover:text-primary",
                )}
              >
                {tab === "customer" ? t.faq.tabCustomer : t.faq.tabProfessional}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">{faqSection.subtitle}</p>
              <p className="mt-1 text-sm text-white/85">{faqSection.desc}</p>
            </div>
          </div>
        </div>

        <Card className="shadow-md">
          <CardBody>
            <h2 className="mb-3 font-bold text-primary">{t.faq.questions}</h2>
            <FaqAccordion key={audience} items={faqItems} />
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="space-y-1">
            <h2 className="mb-3 font-bold text-primary">{t.faq.contact}</h2>
            <p className="mb-3 text-sm text-muted">{t.faq.contactDesc}</p>

            <a
              href={TELEGRAM_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-accent-soft/60 p-4 text-sm font-medium text-primary transition hover:bg-accent/15 hover:text-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-accent">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{t.faq.telegram}</p>
                <p className="text-xs text-muted">{t.faq.telegramDesc}</p>
              </div>
            </a>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-accent-soft/60 p-4 text-sm font-medium text-primary transition hover:bg-accent/15 hover:text-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-accent">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">{t.faq.instagram}</p>
                <p className="text-xs text-muted">{t.faq.instagramDesc}</p>
              </div>
            </a>
          </CardBody>
        </Card>

        {!user && (
          <p className="text-center text-sm text-muted">
            {t.faq.noAccount}{" "}
            <Link href="/login" className="font-semibold text-accent">
              {t.login}
            </Link>
          </p>
        )}
      </PageContainer>
    </div>
  );
}
