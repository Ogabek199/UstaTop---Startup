import {
  Wrench,
  Zap,
  Wind,
  Sofa,
  Sparkles,
  Paintbrush,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/api";
import { serviceName, type Locale } from "@/i18n";

const iconMap: Record<string, React.ElementType> = {
  wrench: Wrench,
  zap: Zap,
  wind: Wind,
  sofa: Sofa,
  sparkles: Sparkles,
  paintbrush: Paintbrush,
};

export function CategoryGrid({
  services,
  locale,
}: {
  services: Service[];
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6">
      {services.map((s) => {
        const Icon = iconMap[s.icon ?? ""] ?? LayoutGrid;
        return (
          <Link
            key={s.id}
            href={`/services/${s.id}`}
            className="group flex flex-col items-center gap-2 rounded-2xl bg-accent-soft p-4 transition hover:bg-accent/15 hover:scale-[1.02]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-primary group-hover:text-accent transition">
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-center text-xs font-semibold text-foreground leading-tight">
              {serviceName(s, locale)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function ExpressBanner({
  title,
  desc,
  fee,
}: {
  title: string;
  desc: string;
  fee: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-white shadow-lg shadow-primary/20">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative">
        <p className="text-lg font-bold">{title}</p>
        <p className="mt-1 text-sm text-white/85">{desc}</p>
        <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
          {fee}
        </span>
      </div>
    </div>
  );
}
