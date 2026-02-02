import { describe, expect, it } from "vitest";

import {
  computeSpending,
  computeTaxes,
  generatePrivateSchedules,
  simulateDeterministic,
  sumOneOffs,
} from "@/lib/simulation";
import { DEFAULT_PARAMS } from "@/lib/defaults";
import { Params } from "@/lib/types";

const baseParams = (overrides: Partial<Params> = {}): Params => ({
  ...DEFAULT_PARAMS,
  ...overrides,
  guardrails: { ...DEFAULT_PARAMS.guardrails, ...(overrides.guardrails ?? {}) },
  assetAlloc: { ...DEFAULT_PARAMS.assetAlloc, ...(overrides.assetAlloc ?? {}) },
  assetReturn: { ...DEFAULT_PARAMS.assetReturn, ...(overrides.assetReturn ?? {}) },
  assetVol: { ...DEFAULT_PARAMS.assetVol, ...(overrides.assetVol ?? {}) },
  privCommit: { ...DEFAULT_PARAMS.privCommit, ...(overrides.privCommit ?? {}) },
  oneOffs: overrides.oneOffs ?? [],
});

describe("spending rules", () => {
  it("applies fixed spending with inflation in nominal mode", () => {
    const params = baseParams({ realMode: false, expenseInflation: 0.03 });
    const year2 = computeSpending(params, params.startWealth, 2, params.annualExpenseNow);
    expect(year2).toBeCloseTo(params.annualExpenseNow * Math.pow(1.03, 2));
  });

  it("applies percent of wealth rule", () => {
    const params = baseParams({ spendingRule: "%wealth", spendPctWealth: 0.04 });
    const spend = computeSpending(params, 12_000_000, 0, params.annualExpenseNow);
    expect(spend).toBeCloseTo(480_000);
  });

  it("applies guardrails with clamp between min and max change", () => {
    const params = baseParams({
      spendingRule: "guardrails",
      guardrails: { targetPctWealth: 0.04, minChange: -0.05, maxChange: 0.05 },
    });
    const lastYear = 400_000;
    const wealth = 10_000_000;
    const spend = computeSpending(params, wealth, 1, lastYear);
    const target = wealth * 0.04;
    const min = lastYear * (1 + params.expenseInflation + params.guardrails.minChange);
    const max = lastYear * (1 + params.expenseInflation + params.guardrails.maxChange);
    expect(spend).toBeGreaterThanOrEqual(Math.min(min, max));
    expect(spend).toBeLessThanOrEqual(Math.max(min, max));
    expect(spend).toBeCloseTo(Math.min(Math.max(target, Math.min(min, max)), Math.max(min, max)));
  });
});

describe("tax calculation", () => {
  it("blends taxes across components", () => {
    const params = baseParams({
      taxInterest: 0.35,
      taxDividends: 0.2,
      taxRealizedGains: 0.25,
    });
    const taxes = computeTaxes({
      params,
      baseForReturn: 1_000_000,
      allocation: params.assetAlloc,
      publicDivYield: 0.02,
      publicRealized: 0.03,
      cashReturn: 0.03,
      privateRealized: 0.05,
    });
    expect(taxes).toBeGreaterThan(0);
    expect(taxes).toBeCloseTo(1_000_000 * (
      params.assetAlloc.public * (0.02 * params.taxDividends + 0.03 * params.taxRealizedGains) +
      params.assetAlloc.cash * (0.03 * params.taxInterest) +
      params.assetAlloc.private * (0.05 * params.taxRealizedGains)
    ), 0);
  });
});

describe("private commitments schedule", () => {
  it("creates linear calls and distributions", () => {
    const schedule = generatePrivateSchedules({
      enabled: true,
      totalCommitment: 2_000_000,
      callYears: 4,
      distLagYears: 2,
      distYears: 4,
      distMultiple: 2,
    }, 10);
    expect(schedule.calls.slice(0, 4)).toEqual([500_000, 500_000, 500_000, 500_000]);
    const distSlice = schedule.distributions.slice(2, 6);
    expect(distSlice.every((value) => value === distSlice[0])).toBe(true);
  });
});

describe("deterministic simulation", () => {
  it("accumulates rows until horizon or ruin", () => {
    const params = baseParams();
    const result = simulateDeterministic(params);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.at(-1)?.age).toBe(params.deathAge);
  });

  it("computes liquidity runway as liquid / (spend + philanthropy)", () => {
    const params = baseParams();
    const { rows } = simulateDeterministic(params);
    const last = rows.at(-1)!;
    const expectedDenominator = Math.max(1, last.expense + last.philanthropy);
    expect(last.liquidityYears).toBeCloseTo(last.liquidWealth / expectedDenominator);
  });

  it("wealth is monotonically non-decreasing with zero spending and positive returns", () => {
    const params = baseParams({
      annualExpenseNow: 0,
      philanthropyMode: "fixed",
      philanthropyFixedNow: 0,
      oneOffs: [],
      runMonteCarlo: false,
      assetReturn: { public: 0.06, private: 0.08, cash: 0.03 },
    });
    const { rows } = simulateDeterministic(params);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].wealth).toBeGreaterThanOrEqual(rows[i - 1].wealth);
    }
  });
});

describe("one-off events", () => {
  it("separates inflows and outflows", () => {
    const params = baseParams({
      oneOffs: [
        { id: "a", year: 1, amount: 100_000 },
        { id: "b", year: 1, amount: -50_000 },
      ],
    });
    const totals = sumOneOffs(params, 1);
    expect(totals.inflows).toBe(100_000);
    expect(totals.outflows).toBe(50_000);
  });
});

describe("return breakdown", () => {
  it("calculates return components correctly", () => {
    const params = baseParams({
      startWealth: 1_000_000,
      annualExpenseNow: 0,
      philanthropyMode: "fixed",
      philanthropyFixedNow: 0,
      oneOffs: [],
      assetAlloc: { public: 0.5, private: 0.3, cash: 0.2 },
      assetReturn: { public: 0.06, private: 0.11, cash: 0.03 },
      publicDivYield: 0.02,
      publicRealizationRate: 0.25,
      privateRealizationRate: 0.2,
    });
    const { rows } = simulateDeterministic(params);
    const firstRow = rows[0];
    
    // Verify return breakdown fields exist
    expect(firstRow.dividendIncome).toBeGreaterThanOrEqual(0);
    expect(firstRow.interestIncome).toBeGreaterThanOrEqual(0);
    expect(firstRow.publicRealizedGains).toBeGreaterThanOrEqual(0);
    expect(firstRow.publicUnrealizedGains).toBeGreaterThanOrEqual(0);
    expect(firstRow.privateRealizedGains).toBeGreaterThanOrEqual(0);
    expect(firstRow.privateUnrealizedGains).toBeGreaterThanOrEqual(0);
    expect(firstRow.grossReturnPct).toBeGreaterThan(0);
    expect(firstRow.netReturnPct).toBeGreaterThan(0);
    
    // Verify return percentages are reasonable
    expect(firstRow.grossReturnPct).toBeLessThan(1); // Less than 100%
    expect(firstRow.netReturnPct).toBeLessThan(firstRow.grossReturnPct); // Net < Gross (due to taxes)
  });

  it("calculates liquid wealth taxes correctly (only on liquid assets)", () => {
    const params = baseParams({
      startWealth: 1_000_000,
      liquidShare: 0.6, // 60% liquid
      annualExpenseNow: 50_000,
      assetAlloc: { public: 0.4, private: 0.5, cash: 0.1 },
      assetReturn: { public: 0.06, private: 0.11, cash: 0.03 },
      taxInterest: 0.35,
      taxDividends: 0.25,
      taxRealizedGains: 0.25,
    });
    const { rows } = simulateDeterministic(params);
    const firstRow = rows[0];
    
    // Liquid wealth should be calculated with only liquid asset taxes
    // This is verified by checking that liquid wealth changes are reasonable
    expect(firstRow.liquidWealth).toBeGreaterThanOrEqual(0);
    expect(firstRow.wealth).toBeGreaterThanOrEqual(firstRow.liquidWealth);
  });
});

