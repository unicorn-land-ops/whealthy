import { formatCurrency, formatPercent } from "@/lib/format";

type KeyStatsProps = {
  currency: string;
  years: number;
  currentAge: number;
  brokeYear: number;
  terminalWealth: number;
  liquidityYears?: number;
  weightedReturn: number;
  realMode: boolean;
  runMonteCarlo: boolean;
  numPaths: number;
  ruinProbability?: number;
  reverseResult?: {
    requiredStartingWealth: number;
    calculatedTerminalWealth: number;
    totalSpending: number;
    totalPhilanthropy: number;
    totalTaxes: number;
    totalReturns: number;
  };
};

export const KeyStats = ({
  currency,
  years,
  currentAge,
  brokeYear,
  terminalWealth,
  liquidityYears,
  weightedReturn,
  realMode,
  runMonteCarlo,
  numPaths,
  ruinProbability,
  reverseResult,
}: KeyStatsProps) => (
  <div className="space-y-2 text-sm">
    {reverseResult ? (
      <>
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="font-semibold text-base text-primary">Required Starting Wealth</div>
          <div className="text-2xl font-bold">
            {formatCurrency(currency, reverseResult.requiredStartingWealth)}
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            To achieve your goals, you need this amount today
          </div>
        </div>
        <div className="flex justify-between">
          <span>Calculated terminal wealth</span>
          <span>{formatCurrency(currency, reverseResult.calculatedTerminalWealth)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total lifetime spending</span>
          <span>{formatCurrency(currency, reverseResult.totalSpending)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total philanthropy</span>
          <span>{formatCurrency(currency, reverseResult.totalPhilanthropy)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total taxes</span>
          <span>{formatCurrency(currency, reverseResult.totalTaxes)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total returns</span>
          <span>{formatCurrency(currency, reverseResult.totalReturns)}</span>
        </div>
      </>
    ) : (
      <>
        <div className="flex justify-between">
          <span>Horizon</span>
          <span>{years} years</span>
        </div>
        <div className="flex justify-between">
          <span>Ruin year (deterministic)</span>
          <span>
            {brokeYear === -1 ? "No ruin" : `Year ${brokeYear} (age ${currentAge + brokeYear})`}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Terminal wealth (deterministic)</span>
          <span>{formatCurrency(currency, Math.max(0, terminalWealth))}</span>
        </div>
      </>
    )}
    <div className="flex justify-between">
      <span>Liquidity runway (years)</span>
      <span>{liquidityYears !== undefined ? liquidityYears.toFixed(1) : "-"}</span>
    </div>
    <div className="flex justify-between">
      <span>Weighted expected return</span>
      <span>
        {formatPercent(weightedReturn)}
        {realMode ? " real" : " nominal"}
      </span>
    </div>
    {runMonteCarlo && (
      <div className="space-y-1 pt-2">
        <div className="font-medium">Monte Carlo</div>
        <div className="flex justify-between">
          <span>Paths</span>
          <span>{numPaths}</span>
        </div>
        <div className="flex justify-between">
          <span>Probability of ruin</span>
          <span>{formatPercent(ruinProbability ?? 0)}</span>
        </div>
      </div>
    )}
  </div>
);

