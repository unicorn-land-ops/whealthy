'use client';

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { SimulationRow } from "@/lib/types";

type ResultsTableProps = {
  currency: string;
  rows: SimulationRow[];
};

const HEADERS: { key: keyof SimulationRow; label: string; format?: "currency" | "percent" | "number" }[] = [
  { key: "age", label: "Age", format: "number" },
  { key: "wealth", label: "Wealth", format: "currency" },
  { key: "liquidWealth", label: "Liquid", format: "currency" },
  { key: "expense", label: "Spend", format: "currency" },
  { key: "philanthropy", label: "Philanthropy", format: "currency" },
  { key: "inflows", label: "Inflows", format: "currency" },
  { key: "outflows", label: "Outflows", format: "currency" },
  { key: "taxes", label: "Taxes", format: "currency" },
  { key: "netReturn", label: "Net return", format: "currency" },
  { key: "grossReturnPct", label: "Gross return %", format: "percent" },
  { key: "netReturnPct", label: "Net return %", format: "percent" },
  { key: "dividendIncome", label: "Dividends", format: "currency" },
  { key: "interestIncome", label: "Interest", format: "currency" },
  { key: "publicRealizedGains", label: "Public realized", format: "currency" },
  { key: "publicUnrealizedGains", label: "Public unrealized", format: "currency" },
  { key: "privateRealizedGains", label: "Private realized", format: "currency" },
  { key: "privateUnrealizedGains", label: "Private unrealized", format: "currency" },
  { key: "liquidityYears", label: "Liquidity yrs", format: "number" },
];

export const ResultsTable = ({ currency, rows }: ResultsTableProps) => {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Annual detail</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="mr-2 h-4 w-4" />
          ) : (
            <ChevronRight className="mr-2 h-4 w-4" />
          )}
          {expanded ? "Hide" : "Show"} table
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="max-h-80 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="text-left text-muted-foreground">
                {HEADERS.map((header) => (
                  <th key={header.key} className="px-3 py-2 font-medium">
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.year} className="whitespace-nowrap">
                  {HEADERS.map((header) => {
                    const value = row[header.key];
                    let formatted: string;
                    if (typeof value === "number") {
                      if (header.format === "percent") {
                        formatted = formatPercent(value);
                      } else if (header.format === "number") {
                        formatted = header.key === "age" ? value.toFixed(0) : value.toFixed(1);
                      } else {
                        formatted = formatCurrency(currency, value);
                      }
                    } else {
                      formatted = String(value);
                    }
                    return (
                      <td key={header.key} className="px-3 py-2">
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
};

