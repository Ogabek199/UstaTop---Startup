"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, HelpCircle } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { LanguageSelect } from "@/components/language-select";
import { PageContainer } from "@/components/page-container";
import { NotificationBell } from "@/components/notification-bell";

export function Header() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
      <PageContainer className="flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <Image
            src="/logo.png"
            alt="UstaTop"
            width={48}
            height={48}
            priority
            className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-1 ring-border/70 shadow-sm transition group-hover:ring-primary/30"
          />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight tracking-tight text-primary">
              {t.appName}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{t.location}</span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelect buttonClassName="bg-white hover:bg-accent-soft" />
          <Link
            href="/faq"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-border text-primary hover:bg-accent-soft transition"
            aria-label={t.helpFaq}
          >
            <HelpCircle className="h-4 w-4" />
          </Link>
          <NotificationBell />
        </div>
      </PageContainer>
    </header>
  );
}
