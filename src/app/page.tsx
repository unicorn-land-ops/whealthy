'use client';

import { useEffect, useMemo, useState, useTransition } from "react";

import { ParamsForm } from "@/components/params-form";
import { EventsTable } from "@/components/events-table";
import { DeterministicChart } from "@/components/deterministic-chart";
import { MonteCarloChart } from "@/components/monte-carlo-chart";
import { KeyStats } from "@/components/key-stats";
import { ResultsTable } from "@/components/results-table";
import { PersistControls } from "@/components/persist-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCurrency } from "@/lib/format";
import {
  calculateReverse,
  normalizeAllocation,
  simulateDeterministic,
  simulateMonteCarlo,
  weightedAverage,
} from "@/lib/simulation";
import { Params, ReverseCalculationResult } from "@/lib/types";
import { useParamsStore } from "@/store/useParamsStore";

type SimulationState = {
  deterministic: ReturnType<typeof simulateDeterministic>;
  reverse?: ReverseCalculationResult;
  params: Params;
  normalizedAlloc: Params["assetAlloc"];
  monteCarlo: ReturnType<typeof simulateMonteCarlo> | null;
};

export default function PlannerPage() {
  const store = useParamsStore();
  const {
    params,
    setParam,
    updateParams,
    applyPreset,
    reset,
    addOneOff,
    updateOneOff,
    removeOneOff,
    exportToJson,
    importFromJson,
  } = store;
  
  // Debug: Log if functions are missing
  if (typeof setParam !== "function") {
    console.error("setParam is not a function", { store, setParam });
  }

  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isPending, startTransition] = useTransition();
  const debouncedParams = useDebouncedValue(params, 150);
  const [isKeyStatsFlipped, setIsKeyStatsFlipped] = useState(false);

  useEffect(() => {
    try {
      startTransition(() => {
        try {
          const normalizedAlloc = normalizeAllocation(debouncedParams.assetAlloc);
          const targetParams = { ...debouncedParams, assetAlloc: normalizedAlloc };

          if (targetParams.calculationMode === "reverse") {
            const reverse = calculateReverse(targetParams);
            // Use the reverse result's rows as deterministic for display
            const deterministic = {
              rows: reverse.rows,
              brokeYear: reverse.rows.findIndex((row) => row.wealth <= 0),
            };
            const monteCarlo = null; // Monte Carlo not supported in reverse mode yet
            setSimState({ deterministic, reverse, params: targetParams, normalizedAlloc, monteCarlo });
          } else {
            const deterministic = simulateDeterministic(targetParams);
            const monteCarlo = debouncedParams.runMonteCarlo
              ? simulateMonteCarlo(targetParams)
              : null;
            setSimState({ deterministic, params: targetParams, normalizedAlloc, monteCarlo });
          }
        } catch (error) {
          console.error("Simulation error:", error);
          // Set a minimal state so UI can still render
          const normalizedAlloc = normalizeAllocation(debouncedParams.assetAlloc);
          const targetParams = { ...debouncedParams, assetAlloc: normalizedAlloc };
          const deterministic = simulateDeterministic(targetParams);
          setSimState({ deterministic, params: targetParams, normalizedAlloc, monteCarlo: null });
        }
      });
    } catch (error) {
      console.error("Effect error:", error);
    }
  }, [debouncedParams, startTransition]);

  const years = useMemo(
    () => Math.max(1, debouncedParams.deathAge - debouncedParams.currentAge),
    [debouncedParams.currentAge, debouncedParams.deathAge],
  );

  const weightedReturn = useMemo(() => {
    if (!simState) return 0;
    return weightedAverage(simState.normalizedAlloc, simState.params.assetReturn);
  }, [simState]);

  const chartData = useMemo(() => {
    if (!simState) return [];
    return simState.deterministic.rows.map((row) => ({
      age: row.age,
      wealth: Math.max(0, row.wealth),
    }));
  }, [simState]);

  const mcChartData = useMemo(() => {
    if (!simState?.monteCarlo) return [];
    const bands = simState.monteCarlo.bands;
    const length = bands["50"].length;
    return Array.from({ length }, (_, index) => ({
      age: simState.params.currentAge + index,
      p5: bands["5"][index],
      p25: bands["25"][index],
      p50: bands["50"][index],
      p75: bands["75"][index],
      p95: bands["95"][index],
    }));
  }, [simState]);

  const liquidityYears = useMemo(() => {
    const lastRow = simState?.deterministic.rows.at(-1);
    return lastRow?.liquidityYears;
  }, [simState]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PersistControls
          onReset={reset}
          exportJson={exportToJson}
          importJson={importFromJson}
        />
        <div className="text-xs text-muted-foreground">
          All calculations run locally. Toggle Monte Carlo for sequence risk.
        </div>
      </div>
      <Tabs defaultValue="inputs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="events">Inflows &amp; One-offs</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="inputs" className="space-y-6">
          <ParamsForm
            params={params}
            onChange={setParam}
            onUpdate={updateParams}
            onPreset={applyPreset}
          />
        </TabsContent>

        <TabsContent value="events">
          <EventsTable
            events={params.oneOffs}
            onAdd={addOneOff}
            onEdit={updateOneOff}
            onRemove={removeOneOff}
          />
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {!simState ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Loading simulation…
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                <Card className="xl:col-span-3">
                  <CardHeader>
                    <CardTitle>Projected wealth (deterministic)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DeterministicChart currency={params.currency} data={chartData} />
                  </CardContent>
                </Card>
                <div className="xl:col-span-2" style={{ perspective: '1000px' }}>
                  <Card 
                    className="cursor-pointer transition-transform duration-500 hover:shadow-md relative"
                    onClick={() => setIsKeyStatsFlipped(!isKeyStatsFlipped)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsKeyStatsFlipped(!isKeyStatsFlipped);
                      }
                    }}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isKeyStatsFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    <div 
                      style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      <CardHeader>
                        <CardTitle>Key outcomes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <KeyStats
                          currency={params.currency}
                          years={years}
                          currentAge={params.currentAge}
                          brokeYear={simState.deterministic.brokeYear}
                          terminalWealth={simState.deterministic.rows.at(-1)?.wealth ?? 0}
                          liquidityYears={liquidityYears}
                          weightedReturn={weightedReturn}
                          realMode={params.realMode}
                          runMonteCarlo={params.runMonteCarlo}
                          numPaths={params.numPaths}
                          ruinProbability={simState.monteCarlo?.ruinProbability}
                          reverseResult={simState.reverse}
                        />
                        {params.runMonteCarlo && isPending && (
                          <p className="pt-3 text-xs text-muted-foreground">
                            Monte Carlo running…
                          </p>
                        )}
                      </CardContent>
                    </div>
                    <div 
                      style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      className="rounded-xl border border-border bg-card"
                    >
                      <CardHeader>
                        <CardTitle>Additional Details</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p className="text-muted-foreground">
                          Click again to flip back to key outcomes.
                        </p>
                        {simState.deterministic.rows.length > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span>Total years simulated</span>
                              <span>{simState.deterministic.rows.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Starting wealth</span>
                              <span>{formatCurrency(params.currency, simState.params.startWealth)}</span>
                            </div>
                            {simState.deterministic.brokeYear !== -1 && (
                              <div className="flex justify-between text-destructive">
                                <span>Years until ruin</span>
                                <span>{simState.deterministic.brokeYear}</span>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                </div>
                {params.runMonteCarlo && simState.monteCarlo && (
                  <Card className="xl:col-span-5">
                    <CardHeader>
                      <CardTitle>Wealth distribution bands (Monte Carlo)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MonteCarloChart currency={params.currency} data={mcChartData} />
                    </CardContent>
                  </Card>
                )}
              </div>
              <ResultsTable currency={params.currency} rows={simState.deterministic.rows} />
            </>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Model notes &amp; caveats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Real mode treats returns and spending inputs as constant purchasing power;
                  nominal mode inflates fixed spending and philanthropy by CPI.
                </li>
                <li>
                  Taxes: Configurable by jurisdiction. Germany: 95% dividend exemption (if ownership ≥10%), 
                  Körperschaftsteuer (15%) + Solidaritätszuschlag (5.5%). Gewerbesteuer (municipal, ~14-17%) 
                  exempt for Vermögensverwaltende Gesellschaften. Capital gains (including private equity distributions) 
                  are fully taxable. US: 21% corporate tax. Combined: German corporate tax + US withholding on 
                  US-source dividends only (5% if ≥10% ownership, 0% if ≥80%). &quot;Other&quot; dividend sources use 
                  German tax treatment only. Custom rates available.
                </li>
                <li>
                  Private commitments: calls and distributions linearized; MOIC applied to called capital
                  after lag. Real-world pacing, carry, and recycling are simplified away.
                </li>
                <li>
                  Liquidity runway approximates liquid assets (public + cash) divided by next year’s
                  spend plus philanthropy—use as directional guidance.
                </li>
                <li>
                  Monte Carlo perturbs annual returns independently per asset bucket; correlations and regime
                  shifts are omitted in this MVP.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Acceptance check: defaults show no deterministic ruin to age {params.deathAge}, liquidity
                runway is reported, and JSON import/export round-trips parameters.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="text-xs text-muted-foreground">
        Try: start {formatCurrency(params.currency, 10_000_000)}, spend {formatCurrency(params.currency, 300_000)},
        philanthropy 1% of wealth, private commitments {formatCurrency(params.currency, 2_000_000)} over 4 years; toggle real
        mode; compare liquidity runway.
      </div>
    </main>
  );
}
