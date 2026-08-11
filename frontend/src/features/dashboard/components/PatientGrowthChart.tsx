import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PatientGrowthPoint } from "@/features/dashboard/dashboard.types";

function formatTickDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export interface PatientGrowthChartProps {
  data: PatientGrowthPoint[] | undefined;
  isLoading: boolean;
}

export function PatientGrowthChart({ data, isLoading }: PatientGrowthChartProps) {
  // "No data" here means no new patients were registered in the window at all,
  // i.e. the cumulative line is perfectly flat (every count is 0).
  const hasData = !!data && data.some((point) => point.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Patient growth (last 30 days)</CardTitle>
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
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tickFormatter={formatTickDate}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={32} />
              <Tooltip labelFormatter={(value) => formatTickDate(String(value))} />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Total patients"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
