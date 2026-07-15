"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Locale } from "@/i18n";
import { formatMonthShort } from "@/lib/date";
import { formatPrice } from "@/lib/utils";

type MonthPoint = {
  month: string;
  count: number;
  earnings: number;
};

export function MonthlyOrdersChart({
  data,
  locale,
  ordersLabel,
  earningsLabel,
}: {
  data: MonthPoint[];
  locale: Locale;
  ordersLabel: string;
  earningsLabel: string;
}) {
  const chartData = data.map((m) => ({
    ...m,
    label: formatMonthShort(m.month, locale),
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)", opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as MonthPoint & { label: string };
              return (
                <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-lg text-sm">
                  <p className="font-semibold text-primary mb-1">
                    {formatMonthShort(point.month, locale)}
                  </p>
                  <p className="text-muted">
                    {ordersLabel}:{" "}
                    <span className="font-semibold text-accent">{point.count}</span>
                  </p>
                  <p className="text-muted">
                    {earningsLabel}:{" "}
                    <span className="font-semibold text-primary">
                      {formatPrice(point.earnings, locale)} so&apos;m
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
