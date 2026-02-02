'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatMillions } from "@/lib/format";

type MonteCarloChartProps = {
  currency: string;
  data: {
    age: number;
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  }[];
};

export const MonteCarloChart = ({ currency, data }: MonteCarloChartProps) => (
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="age"
          label={{ value: "Age", position: "insideBottomRight", offset: -4 }}
        />
        <YAxis
          width={84}
          tickFormatter={(value) => formatMillions(currency, Number(value))}
        />
        <RechartsTooltip
          formatter={(value: number) => formatCurrency(currency, value)}
          labelFormatter={(label) => `Age ${label}`}
        />
        <Area
          type="monotone"
          dataKey="p95"
          stroke="var(--color-muted-foreground)"
          fill="var(--color-muted)"
          strokeWidth={1}
          fillOpacity={0.15}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="p75"
          stroke="var(--color-secondary-foreground)"
          fill="var(--color-secondary)"
          strokeWidth={1}
          fillOpacity={0.2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="p50"
          stroke="var(--color-primary)"
          fill="var(--color-primary)"
          strokeWidth={2}
          fillOpacity={0.25}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="p25"
          stroke="var(--color-secondary-foreground)"
          fill="var(--color-secondary)"
          strokeWidth={1}
          fillOpacity={0.2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="p5"
          stroke="var(--color-muted-foreground)"
          fill="var(--color-muted)"
          strokeWidth={1}
          fillOpacity={0.15}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

