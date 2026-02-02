'use client';

import { useMemo } from "react";
import { Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPercent } from "@/lib/format";
import { DEFAULT_PARAMS, SEED_PRESETS } from "@/lib/defaults";
import { Params } from "@/lib/types";

type ParamsFormProps = {
  params: Params;
  onChange: <K extends keyof Params>(key: K, value: Params[K]) => void;
  onUpdate: (patch: Partial<Params>) => void;
  onPreset: (id: string) => void;
};

type NumberFieldProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  title?: string;
  onChange: (value: number) => void;
};

const NumberField = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  title,
  onChange,
}: NumberFieldProps) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1">
      <Label title={title}>{label}{suffix ? ` (${suffix})` : ""}</Label>
    </div>
    <Input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        console.log("NumberField onChange fired", { value: event.target.value, onChange });
        const next = Number(event.target.value);
        if (onChange && typeof onChange === "function") {
          onChange(Number.isFinite(next) ? next : value);
        } else {
          console.error("NumberField: onChange is not a function", { onChange });
        }
      }}
    />
  </div>
);

const PercentField = ({
  label,
  value,
  step,
  title,
  onChange,
}: Omit<NumberFieldProps, "suffix" | "min" | "max">) => (
  <NumberField
    label={label}
    suffix="%"
    value={value}
    step={step ?? 0.01}
    title={title}
    onChange={onChange}
  />
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{children}</div>
);

export const ParamsForm = (props: ParamsFormProps) => {
  const { 
    params: paramsProp, 
    onChange: onChangeProp, 
    onUpdate: onUpdateProp, 
    onPreset: onPresetProp 
  } = props;
  
  // Ensure callbacks are functions (defensive)
  const onChange = onChangeProp || (() => console.error("onChange not provided"));
  const onUpdate = onUpdateProp || (() => console.error("onUpdate not provided"));
  const onPreset = onPresetProp || (() => console.error("onPreset not provided"));
  
  // Ensure holdingCompanyStructure exists (backward compatibility)
  const params = useMemo(() => {
    if (!paramsProp.holdingCompanyStructure) {
      return {
        ...paramsProp,
        holdingCompanyStructure: DEFAULT_PARAMS.holdingCompanyStructure,
      };
    }
    return paramsProp;
  }, [paramsProp]);

  const normalizedAlloc = useMemo(() => {
    const total = params.assetAlloc.public + params.assetAlloc.private + params.assetAlloc.cash;
    if (total === 0) return params.assetAlloc;
    return {
      public: params.assetAlloc.public / total,
      private: params.assetAlloc.private / total,
      cash: params.assetAlloc.cash / total,
    };
  }, [params.assetAlloc]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Wealth Longevity Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Model spending, taxes, philanthropy, liquidity, and private commitments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEED_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="secondary"
                size="sm"
                onClick={() => onPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Calculation mode
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Forward: Start with current wealth, project forward. Reverse: Start with spending needs and terminal wealth goal, calculate required starting wealth.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={params.calculationMode === "forward" ? "default" : "secondary"}
                onClick={() => {
                  console.log("Button clicked: forward", { onChange });
                  onChange("calculationMode", "forward");
                }}
              >
                Forward projection
              </Button>
              <Button
                variant={params.calculationMode === "reverse" ? "default" : "secondary"}
                onClick={() => onChange("calculationMode", "reverse")}
              >
                Reverse calculation
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Core assumptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Row>
              <div className="space-y-1">
                <Label>Currency symbol</Label>
                <Input
                  value={params.currency}
                  onChange={(event) => onChange("currency", event.target.value.slice(0, 3))}
                  aria-label="Currency symbol"
                />
              </div>
              {params.calculationMode === "forward" ? (
                <>
                  <NumberField
                    label="Starting wealth"
                    value={params.startWealth}
                    min={0}
                    step={100_000}
                    onChange={(value) => onChange("startWealth", value)}
                  />
                  <PercentField
                    label="Liquid share at start"
                    value={params.liquidShare}
                    onChange={(value) => onChange("liquidShare", value)}
                  />
                </>
              ) : (
                <>
                  <NumberField
                    label="Desired terminal wealth"
                    value={params.desiredTerminalWealth}
                    min={0}
                    step={100_000}
                    title="How much wealth you want to have at death age"
                    onChange={(value) => onChange("desiredTerminalWealth", value)}
                  />
                  <NumberField
                    label="Lifetime spending total (optional)"
                    value={params.lifetimeSpendingTotal}
                    min={0}
                    step={50_000}
                    title="Total amount you plan to spend over your lifetime (helps estimate starting wealth)"
                    onChange={(value) => onChange("lifetimeSpendingTotal", value)}
                  />
                </>
              )}
            </Row>
            <Row>
              <NumberField
                label="Current age"
                value={params.currentAge}
                min={0}
                onChange={(value) => onChange("currentAge", Math.max(0, Math.round(value)))}
              />
              <NumberField
                label="Plan to age"
                value={params.deathAge}
                min={params.currentAge}
                onChange={(value) => onChange("deathAge", Math.max(params.currentAge + 1, Math.round(value)))}
              />
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={params.realMode}
                  onCheckedChange={(checked) => onChange("realMode", checked)}
                  aria-label="Toggle real (inflation-adjusted) mode"
                />
                <Label>Real mode</Label>
              </div>
            </Row>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Spending rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={params.spendingRule === "fixed" ? "default" : "secondary"}
                onClick={() => onChange("spendingRule", "fixed")}
              >
                Fixed
              </Button>
              <Button
                variant={params.spendingRule === "%wealth" ? "default" : "secondary"}
                onClick={() => onChange("spendingRule", "%wealth")}
              >
                % of wealth
              </Button>
              <Button
                variant={params.spendingRule === "guardrails" ? "default" : "secondary"}
                onClick={() => onChange("spendingRule", "guardrails")}
              >
                Guardrails
              </Button>
            </div>
            {params.spendingRule === "fixed" && (
              <Row>
                <NumberField
                  label="Annual expenses (today)"
                  value={params.annualExpenseNow}
                  min={0}
                  step={5_000}
                  onChange={(value) => onChange("annualExpenseNow", value)}
                />
                {!params.realMode && (
                  <PercentField
                    label="Expense inflation"
                    value={params.expenseInflation}
                    step={0.005}
                    onChange={(value) => onChange("expenseInflation", value)}
                  />
                )}
              </Row>
            )}
            {params.spendingRule === "%wealth" && (
              <Row>
                <PercentField
                  label="Spend % of start-of-year wealth"
                  value={params.spendPctWealth}
                  onChange={(value) => onChange("spendPctWealth", value)}
                />
              </Row>
            )}
            {params.spendingRule === "guardrails" && (
              <Row>
                <NumberField
                  label="Base spend (today)"
                  value={params.annualExpenseNow}
                  min={0}
                  step={5_000}
                  onChange={(value) => onChange("annualExpenseNow", value)}
                />
                {!params.realMode && (
                  <PercentField
                    label="Inflation (applied to base)"
                    value={params.expenseInflation}
                    onChange={(value) => onChange("expenseInflation", value)}
                  />
                )}
                <PercentField
                  label="Target % wealth"
                  value={params.guardrails.targetPctWealth}
                  onChange={(value) =>
                    onUpdate({ guardrails: { ...params.guardrails, targetPctWealth: value } })
                  }
                />
                <PercentField
                  label="Min change / yr"
                  value={params.guardrails.minChange}
                  onChange={(value) =>
                    onUpdate({ guardrails: { ...params.guardrails, minChange: value } })
                  }
                />
                <PercentField
                  label="Max change / yr"
                  value={params.guardrails.maxChange}
                  onChange={(value) =>
                    onUpdate({ guardrails: { ...params.guardrails, maxChange: value } })
                  }
                />
              </Row>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Philanthropy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={params.philanthropyMode === "fixed" ? "default" : "secondary"}
                onClick={() => onChange("philanthropyMode", "fixed")}
              >
                Fixed
              </Button>
              <Button
                variant={params.philanthropyMode === "%wealth" ? "default" : "secondary"}
                onClick={() => onChange("philanthropyMode", "%wealth")}
              >
                % of wealth
              </Button>
            </div>
            {params.philanthropyMode === "fixed" ? (
              <NumberField
                label="Philanthropy (today)"
                value={params.philanthropyFixedNow}
                min={0}
                step={2_500}
                onChange={(value) => onChange("philanthropyFixedNow", value)}
              />
            ) : (
              <PercentField
                label="Philanthropy (% of start-of-year wealth)"
                value={params.philanthropyPercent}
                onChange={(value) => onChange("philanthropyPercent", value)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Tax jurisdiction &amp; holding company
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  Configure tax jurisdiction for holding company structure. Germany: 95% dividend exemption with Körperschaftsteuer + Gewerbesteuer. US: 21% corporate tax. Combined: German corporate tax + US withholding on US-source dividends. &quot;Other&quot; sources use German tax treatment only. Private equity distributions are treated as capital gains (fully taxable).
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tax jurisdiction</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={params.taxJurisdiction === "custom" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => onChange("taxJurisdiction", "custom")}
                >
                  Custom rates
                </Button>
                <Button
                  variant={params.taxJurisdiction === "germany" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => onChange("taxJurisdiction", "germany")}
                >
                  Germany
                </Button>
                <Button
                  variant={params.taxJurisdiction === "us" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => onChange("taxJurisdiction", "us")}
                >
                  US
                </Button>
                <Button
                  variant={params.taxJurisdiction === "germany-us" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => onChange("taxJurisdiction", "germany-us")}
                >
                  Germany + US
                </Button>
              </div>
            </div>
            {params.taxJurisdiction !== "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Income source</Label>
                  <Row>
                    <div className="space-y-1">
                      <Label>Public dividends</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={params.holdingCompanyStructure.publicDividendSource === "germany" ? "default" : "secondary"}
                          size="sm"
                          onClick={() =>
                            onUpdate({
                              holdingCompanyStructure: {
                                ...params.holdingCompanyStructure,
                                publicDividendSource: "germany",
                              },
                            })
                          }
                        >
                          Germany
                        </Button>
                        <Button
                          variant={params.holdingCompanyStructure.publicDividendSource === "us" ? "default" : "secondary"}
                          size="sm"
                          onClick={() =>
                            onUpdate({
                              holdingCompanyStructure: {
                                ...params.holdingCompanyStructure,
                                publicDividendSource: "us",
                              },
                            })
                          }
                        >
                          US
                        </Button>
                        <Button
                          variant={params.holdingCompanyStructure.publicDividendSource === "other" ? "default" : "secondary"}
                          size="sm"
                          onClick={() =>
                            onUpdate({
                              holdingCompanyStructure: {
                                ...params.holdingCompanyStructure,
                                publicDividendSource: "other",
                              },
                            })
                          }
                        >
                          Other
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Private equity (capital gains)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground inline ml-1" aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Private equity distributions are treated as capital gains (not dividends). Source selection affects withholding tax treatment.
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex gap-2">
                        <Button
                          variant={params.holdingCompanyStructure.privateDividendSource === "germany" ? "default" : "secondary"}
                          size="sm"
                          onClick={() =>
                            onUpdate({
                              holdingCompanyStructure: {
                                ...params.holdingCompanyStructure,
                                privateDividendSource: "germany",
                              },
                            })
                          }
                        >
                          Germany
                        </Button>
                        <Button
                          variant={params.holdingCompanyStructure.privateDividendSource === "us" ? "default" : "secondary"}
                          size="sm"
                          onClick={() =>
                            onUpdate({
                              holdingCompanyStructure: {
                                ...params.holdingCompanyStructure,
                                privateDividendSource: "us",
                              },
                            })
                          }
                        >
                          US
                        </Button>
                        <Button
                          variant={params.holdingCompanyStructure.privateDividendSource === "other" ? "default" : "secondary"}
                          size="sm"
                          onClick={() =>
                            onUpdate({
                              holdingCompanyStructure: {
                                ...params.holdingCompanyStructure,
                                privateDividendSource: "other",
                              },
                            })
                          }
                        >
                          Other
                        </Button>
                      </div>
                    </div>
                  </Row>
                </div>
                <Row>
                  <PercentField
                    label="US ownership % (for treaty)"
                    value={params.holdingCompanyStructure.usOwnershipPct}
                    title="Ownership percentage in US companies for withholding tax reduction (≥10% = 5%, ≥80% = 0%)"
                    onChange={(value) =>
                      onUpdate({
                        holdingCompanyStructure: {
                          ...params.holdingCompanyStructure,
                          usOwnershipPct: value,
                        },
                      })
                    }
                  />
                  <PercentField
                    label="German ownership % (for exemption)"
                    value={params.holdingCompanyStructure.germanOwnershipPct}
                    title="Ownership percentage for German dividend exemption (≥10% for corporate tax, ≥15% for trade tax)"
                    onChange={(value) =>
                      onUpdate({
                        holdingCompanyStructure: {
                          ...params.holdingCompanyStructure,
                          germanOwnershipPct: value,
                        },
                      })
                    }
                  />
                </Row>
                {(params.taxJurisdiction === "germany" || params.taxJurisdiction === "germany-us") && (
                  <>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={params.holdingCompanyStructure.isVermoegensverwaltend}
                        onCheckedChange={(checked) =>
                          onUpdate({
                            holdingCompanyStructure: {
                              ...params.holdingCompanyStructure,
                              isVermoegensverwaltend: checked,
                            },
                          })
                        }
                        aria-label="Toggle Vermögensverwaltende Gesellschaft"
                      />
                      <Label className="flex items-center gap-1">
                        Vermögensverwaltende Gesellschaft
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" aria-hidden />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Asset management companies are exempt from Gewerbesteuer (trade tax). If enabled, only Körperschaftsteuer (15%) and Solidaritätszuschlag (0.825%) apply.
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>
                    {!params.holdingCompanyStructure.isVermoegensverwaltend && (
                      <PercentField
                        label="German trade tax rate (Gewerbesteuer)"
                        value={params.holdingCompanyStructure.germanTradeTaxRate}
                        title="Municipal trade tax rate, typically 14-17%"
                        onChange={(value) =>
                          onUpdate({
                            holdingCompanyStructure: {
                              ...params.holdingCompanyStructure,
                              germanTradeTaxRate: value,
                            },
                          })
                        }
                      />
                    )}
                  </>
                )}
                {params.taxJurisdiction === "us" && (
                  <PercentField
                    label="US corporate tax rate"
                    value={params.holdingCompanyStructure.usCorporateTaxRate}
                    title="US federal corporate tax rate (currently 21%)"
                    onChange={(value) =>
                      onUpdate({
                        holdingCompanyStructure: {
                          ...params.holdingCompanyStructure,
                          usCorporateTaxRate: value,
                        },
                      })
                    }
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Taxes &amp; returns
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {params.taxJurisdiction === "custom"
                    ? "Custom tax rates apply to income-like components; private and public price returns defer according to realization rates."
                    : "Tax rates are automatically calculated based on selected jurisdiction and holding company structure."}
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.taxJurisdiction === "custom" && (
              <Row>
                <PercentField
                  label="Tax on interest"
                  value={params.taxInterest}
                  onChange={(value) => onChange("taxInterest", value)}
                />
                <PercentField
                  label="Tax on dividends"
                  value={params.taxDividends}
                  onChange={(value) => onChange("taxDividends", value)}
                />
                <PercentField
                  label="Tax on realized gains"
                  value={params.taxRealizedGains}
                  onChange={(value) => onChange("taxRealizedGains", value)}
                />
              </Row>
            )}
            {params.taxJurisdiction !== "custom" && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Tax rates are automatically calculated based on your selected jurisdiction and holding company structure.
                {params.taxJurisdiction === "germany" || params.taxJurisdiction === "germany-us" ? (
                  <div className="mt-2">
                    <div>• Dividends: 95% exempt (only 5% taxable) if ownership ≥10%</div>
                    <div>• Capital gains: Fully taxable (no exemption) - includes private equity distributions</div>
                    <div>• Effective German rate: ~{formatPercent(
                      params.holdingCompanyStructure.isVermoegensverwaltend
                        ? 0.15 + 0.15 * 0.055
                        : 0.15 + 0.15 * 0.055 + params.holdingCompanyStructure.germanTradeTaxRate
                    )} ({params.holdingCompanyStructure.isVermoegensverwaltend ? "KSt + SolZ (no GewSt)" : "KSt + SolZ + GewSt"})</div>
                    {params.taxJurisdiction === "germany-us" && (
                      <div>• US withholding: {formatPercent(params.holdingCompanyStructure.usOwnershipPct >= 0.8 ? 0 : params.holdingCompanyStructure.usOwnershipPct >= 0.1 ? 0.05 : 0.3)} on US-source dividends only</div>
                    )}
                    <div>• &quot;Other&quot; sources: German tax only (no US withholding)</div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div>• US corporate tax: {formatPercent(params.holdingCompanyStructure.usCorporateTaxRate)}</div>
                    <div>• Private equity distributions: Treated as capital gains</div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Allocation (normalized)</Label>
              <Row>
                <PercentField
                  label={`Public (${formatPercent(normalizedAlloc.public)})`}
                  value={params.assetAlloc.public}
                  onChange={(value) =>
                    onUpdate({ assetAlloc: { ...params.assetAlloc, public: value } })
                  }
                />
                <PercentField
                  label={`Private (${formatPercent(normalizedAlloc.private)})`}
                  value={params.assetAlloc.private}
                  onChange={(value) =>
                    onUpdate({ assetAlloc: { ...params.assetAlloc, private: value } })
                  }
                />
                <PercentField
                  label={`Cash (${formatPercent(normalizedAlloc.cash)})`}
                  value={params.assetAlloc.cash}
                  onChange={(value) =>
                    onUpdate({ assetAlloc: { ...params.assetAlloc, cash: value } })
                  }
                />
              </Row>
            </div>
            <div className="space-y-2">
              <Label>Expected returns {params.realMode ? "(real)" : "(nominal)"}</Label>
              <Row>
                <PercentField
                  label="Public total return"
                  value={params.assetReturn.public}
                  onChange={(value) =>
                    onUpdate({ assetReturn: { ...params.assetReturn, public: value } })
                  }
                />
                <PercentField
                  label="Private total return"
                  value={params.assetReturn.private}
                  onChange={(value) =>
                    onUpdate({ assetReturn: { ...params.assetReturn, private: value } })
                  }
                />
                <PercentField
                  label="Cash yield"
                  value={params.assetReturn.cash}
                  onChange={(value) =>
                    onUpdate({ assetReturn: { ...params.assetReturn, cash: value } })
                  }
                />
              </Row>
            </div>
            <div className="space-y-2">
              <Label>Public return decomposition</Label>
              <Row>
                <PercentField
                  label="Dividend yield"
                  value={params.publicDivYield}
                  onChange={(value) => onChange("publicDivYield", value)}
                />
                <PercentField
                  label="Realization rate (price)"
                  value={params.publicRealizationRate}
                  onChange={(value) => onChange("publicRealizationRate", value)}
                />
                <PercentField
                  label="Private realization rate"
                  value={params.privateRealizationRate}
                  onChange={(value) => onChange("privateRealizationRate", value)}
                />
              </Row>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Private commitments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={params.privCommit.enabled}
                onCheckedChange={(checked) =>
                  onUpdate({ privCommit: { ...params.privCommit, enabled: checked } })
                }
                aria-label="Toggle private commitments engine"
              />
              <Label>Enable commitments engine</Label>
            </div>
            {params.privCommit.enabled && (
              <Row>
                <NumberField
                  label="Total commitment"
                  value={params.privCommit.totalCommitment}
                  min={0}
                  step={100_000}
                  onChange={(value) =>
                    onUpdate({ privCommit: { ...params.privCommit, totalCommitment: value } })
                  }
                />
                <NumberField
                  label="Call years"
                  value={params.privCommit.callYears}
                  min={1}
                  onChange={(value) =>
                    onUpdate({
                      privCommit: { ...params.privCommit, callYears: Math.max(1, Math.round(value)) },
                    })
                  }
                />
                <NumberField
                  label="Dist lag (yrs)"
                  value={params.privCommit.distLagYears}
                  min={0}
                  onChange={(value) =>
                    onUpdate({
                      privCommit: {
                        ...params.privCommit,
                        distLagYears: Math.max(0, Math.round(value)),
                      },
                    })
                  }
                />
                <NumberField
                  label="Dist years"
                  value={params.privCommit.distYears}
                  min={1}
                  onChange={(value) =>
                    onUpdate({
                      privCommit: {
                        ...params.privCommit,
                        distYears: Math.max(1, Math.round(value)),
                      },
                    })
                  }
                />
                <NumberField
                  label="MOIC on called"
                  value={params.privCommit.distMultiple}
                  step={0.1}
                  onChange={(value) =>
                    onUpdate({
                      privCommit: { ...params.privCommit, distMultiple: value },
                    })
                  }
                />
              </Row>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={params.runMonteCarlo}
                onCheckedChange={(checked) => onChange("runMonteCarlo", checked)}
                aria-label="Toggle Monte Carlo simulation"
              />
              <Label>Enable Monte Carlo</Label>
            </div>
            {params.runMonteCarlo && (
              <NumberField
                label="Monte Carlo paths"
                value={params.numPaths}
                min={100}
                max={2_000}
                step={50}
                onChange={(value) =>
                  onChange("numPaths", Math.max(100, Math.min(2_000, Math.round(value))))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

