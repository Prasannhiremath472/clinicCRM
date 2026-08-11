import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RevenueTrendPoint } from "@/features/dashboard/dashboard.types";

function formatTickDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export interface RevenueTrendChartProps {
  data: RevenueTrendPoint[] | undefined;
  isLoading: boolean;
}

export function RevenueTrendChart({ data, isLoading }: RevenueTrendChartProps) {
  const hasData = !!data && data.some((point) => point.amount > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue (last 30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !hasData ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No data yet for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={data}>
              <XAxis
                dataKey="date"
                tickFormatter={formatTickDate}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                labelFormatter={(value) => formatTickDate(String(value))}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area
                type="monotone"
                dataKey="amount"
                name="Revenue"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
