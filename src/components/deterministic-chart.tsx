'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatMillions } from "@/lib/format";

type DeterministicChartProps = {
  currency: string;
  data: { age: number; wealth: number }[];
};

export const DeterministicChart = ({ currency, data }: DeterministicChartProps) => (
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
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
        <Line
          type="monotone"
          dataKey="wealth"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

