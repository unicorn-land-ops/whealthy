import { DEFAULT_PARAMS } from "@/lib/defaults";
import {
  DeterministicResult,
  MonteCarloBands,
  MonteCarloResult,
  Params,
  PrivateCommitments,
  ReverseCalculationResult,
  SimulationRow,
} from "@/lib/types";
import {
  computeHoldingCompanyTaxes,
  computeLiquidHoldingCompanyTaxes,
} from "@/lib/tax";

export const MAX_MONTE_CARLO_PATHS = 2_000;

export type Allocation = Params["assetAlloc"];

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const normalizeAllocation = (alloc: Allocation) => {
  const total = alloc.public + alloc.private + alloc.cash;
  if (total === 0) {
    return alloc;
  }
  return {
    public: alloc.public / total,
    private: alloc.private / total,
    cash: alloc.cash / total,
  };
};

type WeightedValues = { public: number; private: number; cash: number };

export const weightedAverage = (
  weights: Allocation,
  values: WeightedValues,
) => weights.public * values.public + weights.private * values.private + weights.cash * values.cash;

export type PrivateSchedule = {
  calls: number[];
  distributions: number[];
};

export const generatePrivateSchedules = (
  privCommit: PrivateCommitments,
  years: number,
): PrivateSchedule => {
  const calls = Array(years + 1).fill(0);
  const distributions = Array(years + 1).fill(0);

  if (!privCommit.enabled || privCommit.totalCommitment <= 0) {
    return { calls, distributions };
  }

  const effectiveCallYears = Math.min(privCommit.callYears, years + 1);
  const callPerYear = privCommit.totalCommitment / Math.max(effectiveCallYears, 1);
  for (let year = 0; year < effectiveCallYears; year++) {
    calls[year] = callPerYear;
  }

  const totalCalled = callPerYear * effectiveCallYears;
  const totalReturn = totalCalled * privCommit.distMultiple;
  const distYears = Math.max(1, Math.min(privCommit.distYears, years + 1 - privCommit.distLagYears));
  const distPerYear = totalReturn / distYears;
  const start = privCommit.distLagYears;
  const finalYear = Math.min(start + distYears, years + 1);
  for (let y = start; y < finalYear; y++) {
    distributions[y] = distPerYear;
  }

  return { calls, distributions };
};

export const boxMuller = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export const computeSpending = (
  params: Params,
  wealth: number,
  yearIndex: number,
  lastYearSpend: number,
) => {
  switch (params.spendingRule) {
    case "%wealth":
      return params.spendPctWealth * wealth;
    case "guardrails": {
      const target = params.guardrails.targetPctWealth * wealth;
      const inflation = params.realMode ? 0 : params.expenseInflation;
      const minSpend = lastYearSpend * (1 + inflation + params.guardrails.minChange);
      const maxSpend = lastYearSpend * (1 + inflation + params.guardrails.maxChange);
      return clamp(target, Math.min(minSpend, maxSpend), Math.max(minSpend, maxSpend));
    }
    case "fixed":
    default: {
      const inflation = params.realMode ? 0 : params.expenseInflation;
      return params.annualExpenseNow * Math.pow(1 + inflation, yearIndex);
    }
  }
};

export const computePhilanthropy = (params: Params, wealth: number, yearIndex: number) => {
  if (params.philanthropyMode === "%wealth") {
    return params.philanthropyPercent * wealth;
  }
  const inflation = params.realMode ? 0 : params.expenseInflation;
  return params.philanthropyFixedNow * Math.pow(1 + inflation, yearIndex);
};

export const sumOneOffs = (params: Params, yearIndex: number) => {
  const events = params.oneOffs.filter((event) => event.year === yearIndex);
  const inflows = events.filter((event) => event.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
  const outflows = events.filter((event) => event.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  return { inflows, outflows };
};

export const computeTaxes = ({
  params,
  baseForReturn,
  allocation,
  publicDivYield,
  publicRealized,
  cashReturn,
  privateRealized,
}: {
  params: Params;
  baseForReturn: number;
  allocation: Allocation;
  publicDivYield: number;
  publicRealized: number;
  cashReturn: number;
  privateRealized: number;
}) => {
  return computeHoldingCompanyTaxes({
    params,
    baseForReturn,
    allocation,
    publicDivYield,
    publicRealized,
    cashReturn,
    privateRealized,
  });
};

/**
 * Calculate taxes only on liquid assets (public + cash)
 * Used for liquid wealth calculation
 */
export const computeLiquidTaxes = ({
  params,
  baseForReturn,
  allocation,
  publicDivYield,
  publicRealized,
  cashReturn,
}: {
  params: Params;
  baseForReturn: number;
  allocation: Allocation;
  publicDivYield: number;
  publicRealized: number;
  cashReturn: number;
}) => {
  return computeLiquidHoldingCompanyTaxes({
    params,
    baseForReturn,
    allocation,
    publicDivYield,
    publicRealized,
    cashReturn,
  });
};

export const simulateDeterministic = (input: Params): DeterministicResult => {
  const params = {
    ...DEFAULT_PARAMS,
    ...input,
    guardrails: { ...DEFAULT_PARAMS.guardrails, ...input.guardrails },
    assetAlloc: { ...DEFAULT_PARAMS.assetAlloc, ...input.assetAlloc },
    assetReturn: { ...DEFAULT_PARAMS.assetReturn, ...input.assetReturn },
    assetVol: { ...DEFAULT_PARAMS.assetVol, ...input.assetVol },
    privCommit: { ...DEFAULT_PARAMS.privCommit, ...input.privCommit },
    holdingCompanyStructure: {
      ...DEFAULT_PARAMS.holdingCompanyStructure,
      ...input.holdingCompanyStructure,
    },
  };

  const years = Math.max(1, params.deathAge - params.currentAge);
  const allocation = normalizeAllocation(params.assetAlloc);
  const { calls: privateCalls, distributions: privateDistributions } = generatePrivateSchedules(
    params.privCommit,
    years,
  );

  let wealth = params.startWealth;
  let liquidWealth = params.startWealth * clamp(params.liquidShare, 0, 1);
  let lastYearSpend = params.annualExpenseNow;

  const rows: SimulationRow[] = [];

  for (let yearIndex = 0; yearIndex <= years; yearIndex++) {
    const age = params.currentAge + yearIndex;
    const expense = computeSpending(params, wealth, yearIndex, lastYearSpend);
    const philanthropy = computePhilanthropy(params, wealth, yearIndex);
    const oneOffs = sumOneOffs(params, yearIndex);
    const privateCall = privateCalls[yearIndex] ?? 0;
    const privateDistribution = privateDistributions[yearIndex] ?? 0;

    const totalOutflowsPreTax = expense + philanthropy + oneOffs.outflows + privateCall;
    const totalInflowsPreTax = oneOffs.inflows + privateDistribution;

    const baseForReturn = Math.max(0, wealth - 0.5 * totalOutflowsPreTax + 0.5 * totalInflowsPreTax);
    const publicReturn = params.assetReturn.public;
    const publicDivYield = params.publicDivYield;
    const publicPriceReturn = Math.max(0, publicReturn - publicDivYield);
    const publicRealized = params.publicRealizationRate * publicPriceReturn;

    const cashReturn = params.assetReturn.cash;
    const privateReturn = params.assetReturn.private;
    const privateRealized = params.privateRealizationRate * Math.max(0, privateReturn);

    const grossReturn =
      allocation.public * publicReturn +
      allocation.private * privateReturn +
      allocation.cash * cashReturn;

    const taxes = computeTaxes({
      params,
      baseForReturn,
      allocation,
      publicDivYield,
      publicRealized,
      cashReturn,
      privateRealized,
    });

    // Calculate liquid taxes separately (only on public + cash)
    const liquidTaxes = computeLiquidTaxes({
      params,
      baseForReturn,
      allocation,
      publicDivYield,
      publicRealized,
      cashReturn,
    });

    const netReturn = baseForReturn * grossReturn - taxes;

    wealth = wealth + totalInflowsPreTax + netReturn - totalOutflowsPreTax;

    // Calculate return breakdown components
    const publicBase = baseForReturn * allocation.public;
    const cashBase = baseForReturn * allocation.cash;
    const privateBase = baseForReturn * allocation.private;

    const dividendIncome = publicBase * publicDivYield;
    const interestIncome = cashBase * cashReturn;
    const publicUnrealizedGains = publicBase * Math.max(0, publicPriceReturn - publicRealized);
    const publicRealizedGains = publicBase * publicRealized;
    const privateUnrealizedGains = privateBase * Math.max(0, privateReturn - privateRealized);
    const privateRealizedGains = privateBase * privateRealized;

    const liquidBefore = liquidWealth;
    const liquidReturn =
      baseForReturn *
      (allocation.public * publicReturn + allocation.cash * cashReturn);
    const liquidAfter =
      liquidBefore +
      totalInflowsPreTax -
      privateCall -
      expense -
      philanthropy -
      oneOffs.outflows +
      liquidReturn -
      liquidTaxes; // Use liquidTaxes instead of full taxes

    liquidWealth = Math.max(0, liquidAfter);
    const liquidityYears = (liquidWealth) / Math.max(1, expense + philanthropy);

    // Calculate return percentages
    const grossReturnPct = baseForReturn > 0 ? grossReturn : 0;
    const netReturnPct = baseForReturn > 0 ? netReturn / baseForReturn : 0;

    rows.push({
      year: yearIndex,
      age,
      wealth,
      liquidWealth,
      expense,
      philanthropy,
      inflows: totalInflowsPreTax,
      outflows: totalOutflowsPreTax,
      taxes,
      netReturn,
      liquidityYears,
      dividendIncome,
      interestIncome,
      publicRealizedGains,
      publicUnrealizedGains,
      privateRealizedGains,
      privateUnrealizedGains,
      grossReturnPct,
      netReturnPct,
    });

    lastYearSpend = expense;
    if (wealth <= 0) {
      break;
    }
  }

  const brokeYear = rows.findIndex((row) => row.wealth <= 0);

  return { rows, brokeYear };
};

const computePercentiles = (values: number[], quantiles: number[]): number[] =>
  quantiles.map((q) => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(((q / 100) * (sorted.length - 1)));
    return sorted[index] ?? sorted[sorted.length - 1] ?? 0;
  });

export const simulateMonteCarlo = (params: Params): MonteCarloResult => {
  const allocation = normalizeAllocation(params.assetAlloc);
  const years = Math.max(1, params.deathAge - params.currentAge);
  const numPaths = Math.min(params.numPaths, MAX_MONTE_CARLO_PATHS);

  const paths: number[][] = [];

  for (let pathIdx = 0; pathIdx < numPaths; pathIdx++) {
    const randomized: Params = {
      ...params,
      assetReturn: {
        public: params.assetReturn.public + params.assetVol.public * boxMuller(),
        private: params.assetReturn.private + params.assetVol.private * boxMuller(),
        cash: params.assetReturn.cash + params.assetVol.cash * boxMuller(),
      },
    };

    const result = simulateDeterministic({
      ...randomized,
      assetAlloc: allocation,
    });

    const trajectory = result.rows.map((row) => row.wealth);
    while (trajectory.length < years + 1) {
      trajectory.push(trajectory[trajectory.length - 1] ?? 0);
    }
    paths.push(trajectory);
  }

  const bands: MonteCarloBands = {
    "5": [],
    "25": [],
    "50": [],
    "75": [],
    "95": [],
  };

  for (let yearIdx = 0; yearIdx <= years; yearIdx++) {
    const values = paths.map((trajectory) => trajectory[yearIdx] ?? 0);
    const [p5, p25, p50, p75, p95] = computePercentiles(values, [5, 25, 50, 75, 95]);
    bands["5"].push(Math.max(0, p5));
    bands["25"].push(Math.max(0, p25));
    bands["50"].push(Math.max(0, p50));
    bands["75"].push(Math.max(0, p75));
    bands["95"].push(Math.max(0, p95));
  }

  let ruinCount = 0;
  for (const trajectory of paths) {
    if (trajectory.findIndex((wealth) => wealth <= 0) !== -1) {
      ruinCount += 1;
    }
  }

  return {
    paths,
    bands,
    ruinProbability: numPaths === 0 ? 0 : ruinCount / numPaths,
  };
};

/**
 * Reverse calculation: Given desired terminal wealth and lifetime spending needs,
 * calculate the required starting wealth today.
 * Uses binary search to find the starting wealth that achieves the goal.
 */
export const calculateReverse = (params: Params): ReverseCalculationResult => {
  const targetTerminalWealth = params.desiredTerminalWealth;
  const tolerance = 1000; // Within $1k of target
  const maxIterations = 50;

  // Binary search bounds
  let low = 0;
  let high = 1_000_000_000; // $1B upper bound
  let bestGuess = 0;
  let bestResult: DeterministicResult | null = null;

  // If lifetime spending total is specified, use it as a lower bound estimate
  if (params.lifetimeSpendingTotal > 0) {
    // Rough estimate: PV of spending + terminal wealth, discounted by returns
    const roughEstimate = params.lifetimeSpendingTotal + targetTerminalWealth;
    high = Math.max(high, roughEstimate * 2);
    low = Math.max(0, roughEstimate * 0.5);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const guess = (low + high) / 2;
    const testParams: Params = {
      ...params,
      startWealth: guess,
    };

    const result = simulateDeterministic(testParams);
    const finalWealth = result.rows[result.rows.length - 1]?.wealth ?? 0;
    const diff = finalWealth - targetTerminalWealth;

    if (Math.abs(diff) < tolerance) {
      bestGuess = guess;
      bestResult = result;
      break;
    }

    if (diff > 0) {
      // Too much wealth at end, need less starting wealth
      high = guess;
    } else {
      // Too little wealth at end, need more starting wealth
      low = guess;
    }

    bestGuess = guess;
    bestResult = result;
  }

  if (!bestResult) {
    // Fallback: use the last simulation
    const testParams: Params = { ...params, startWealth: bestGuess };
    bestResult = simulateDeterministic(testParams);
  }

  const finalRow = bestResult.rows[bestResult.rows.length - 1];
  const totalSpending = bestResult.rows.reduce((sum, row) => sum + row.expense, 0);
  const totalPhilanthropy = bestResult.rows.reduce((sum, row) => sum + row.philanthropy, 0);
  const totalTaxes = bestResult.rows.reduce((sum, row) => sum + row.taxes, 0);
  const totalReturns = bestResult.rows.reduce((sum, row) => sum + row.netReturn, 0);

  return {
    requiredStartingWealth: bestGuess,
    calculatedTerminalWealth: finalRow?.wealth ?? 0,
    totalSpending,
    totalPhilanthropy,
    totalTaxes,
    totalReturns,
    rows: bestResult.rows,
  };
};

