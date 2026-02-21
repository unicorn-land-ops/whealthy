import { z } from "zod";

export const cashEventSchema = z.object({
  id: z.string(),
  year: z.number().int().min(0),
  amount: z.number(),
  label: z.string().optional(),
});

export type CashEvent = z.infer<typeof cashEventSchema>;

export const privateCommitmentsSchema = z.object({
  enabled: z.boolean(),
  totalCommitment: z.number().min(0),
  callYears: z.number().int().min(1),
  distLagYears: z.number().int().min(0),
  distYears: z.number().int().min(1),
  distMultiple: z.number().min(0),
});

export type PrivateCommitments = z.infer<typeof privateCommitmentsSchema>;

export const paramsSchema = z.object({
  currency: z.string().min(1).max(3),
  calculationMode: z.enum(["forward", "reverse"]).default("forward"),
  startWealth: z.number().min(0),
  liquidShare: z.number().min(0).max(1.5),
  currentAge: z.number().int().min(0).max(120),
  deathAge: z.number().int().min(1).max(130),
  spendingRule: z.enum(["fixed", "%wealth", "guardrails"]),
  annualExpenseNow: z.number().min(0),
  expenseInflation: z.number().min(0).max(1),
  spendPctWealth: z.number().min(0).max(1),
  guardrails: z.object({
    targetPctWealth: z.number().min(0).max(1),
    minChange: z.number().min(-1).max(1),
    maxChange: z.number().min(-1).max(1),
  }),
  philanthropyMode: z.enum(["fixed", "%wealth"]),
  philanthropyFixedNow: z.number().min(0),
  philanthropyPercent: z.number().min(0).max(1),
  // Reverse calculation inputs
  desiredTerminalWealth: z.number().min(0).default(0),
  lifetimeSpendingTotal: z.number().min(0).default(0),
  realMode: z.boolean(),
  // Tax configuration
  taxResidences: z.array(z.enum(["us", "uk", "germany", "france"]))
    .min(1)
    .default(["germany", "us"]),
  taxResidenceWeights: z.object({
    us: z.number().min(0).max(1),
    uk: z.number().min(0).max(1),
    germany: z.number().min(0).max(1),
    france: z.number().min(0).max(1),
  }).default({
    us: 0.5,
    uk: 0,
    germany: 0.5,
    france: 0,
  }),
  doubleTaxRelief: z.number().min(0).max(1).default(0.5),
  taxJurisdiction: z.enum(["custom", "germany", "us", "germany-us"]).default("custom"),
  // Legacy tax fields (used when taxJurisdiction is "custom")
  taxInterest: z.number().min(0).max(1),
  taxDividends: z.number().min(0).max(1),
  taxRealizedGains: z.number().min(0).max(1),
  // Holding company structure
  holdingCompanyStructure: z.object({
    // Source of income breakdown (for withholding tax calculation)
    publicDividendSource: z.enum(["germany", "us", "other"]).default("other"),
    privateDividendSource: z.enum(["germany", "us", "other"]).default("other"),
    // Ownership percentages for treaty benefits
    usOwnershipPct: z.number().min(0).max(1).default(0.1), // For US dividend withholding reduction
    germanOwnershipPct: z.number().min(0).max(1).default(0.1), // For German dividend exemption
    // German-specific settings
    isVermoegensverwaltend: z.boolean().default(true), // Vermögensverwaltende Gesellschaft (exempt from Gewerbesteuer)
    germanTradeTaxRate: z.number().min(0).max(0.2).default(0.14), // Municipal trade tax rate (Gewerbesteuer) - only if not Vermögensverwaltend
    // US-specific settings
    usCorporateTaxRate: z.number().min(0).max(0.5).default(0.21), // US corporate tax rate
  }).default({
    publicDividendSource: "other",
    privateDividendSource: "other",
    usOwnershipPct: 0.1,
    germanOwnershipPct: 0.1,
    isVermoegensverwaltend: true,
    germanTradeTaxRate: 0.14,
    usCorporateTaxRate: 0.21,
  }),
  assetAlloc: z.object({
    public: z.number().min(0),
    private: z.number().min(0),
    cash: z.number().min(0),
  }),
  assetReturn: z.object({
    public: z.number(),
    private: z.number(),
    cash: z.number(),
  }),
  assetVol: z.object({
    public: z.number().min(0),
    private: z.number().min(0),
    cash: z.number().min(0),
  }),
  publicDivYield: z.number().min(0),
  publicRealizationRate: z.number().min(0).max(1),
  privateRealizationRate: z.number().min(0).max(1),
  privCommit: privateCommitmentsSchema,
  runMonteCarlo: z.boolean(),
  numPaths: z.number().int().min(100).max(2000),
  oneOffs: z.array(cashEventSchema),
});

export type Params = z.infer<typeof paramsSchema>;

export type SimulationRow = {
  year: number;
  age: number;
  wealth: number;
  liquidWealth: number;
  expense: number;
  philanthropy: number;
  inflows: number;
  outflows: number;
  taxes: number;
  netReturn: number;
  liquidityYears: number;
  // Return breakdown
  dividendIncome: number;
  interestIncome: number;
  publicRealizedGains: number;
  publicUnrealizedGains: number;
  privateRealizedGains: number;
  privateUnrealizedGains: number;
  grossReturnPct: number;
  netReturnPct: number;
};

export type DeterministicResult = {
  rows: SimulationRow[];
  brokeYear: number;
};

export type MonteCarloBands = Record<"5" | "25" | "50" | "75" | "95", number[]>;

export type MonteCarloResult = {
  paths: number[][];
  bands: MonteCarloBands;
  ruinProbability: number;
};

export type ReverseCalculationResult = {
  requiredStartingWealth: number;
  calculatedTerminalWealth: number;
  totalSpending: number;
  totalPhilanthropy: number;
  totalTaxes: number;
  totalReturns: number;
  rows: SimulationRow[];
};

export const paramsStorageSchema = paramsSchema.pick({
  currency: true,
  calculationMode: true,
  startWealth: true,
  liquidShare: true,
  currentAge: true,
  deathAge: true,
  spendingRule: true,
  annualExpenseNow: true,
  expenseInflation: true,
  spendPctWealth: true,
  guardrails: true,
  philanthropyMode: true,
  philanthropyFixedNow: true,
  philanthropyPercent: true,
  desiredTerminalWealth: true,
  lifetimeSpendingTotal: true,
  realMode: true,
  taxResidences: true,
  taxResidenceWeights: true,
  doubleTaxRelief: true,
  taxJurisdiction: true,
  taxInterest: true,
  taxDividends: true,
  taxRealizedGains: true,
  holdingCompanyStructure: true,
  assetAlloc: true,
  assetReturn: true,
  assetVol: true,
  publicDivYield: true,
  publicRealizationRate: true,
  privateRealizationRate: true,
  privCommit: true,
  runMonteCarlo: true,
  numPaths: true,
  oneOffs: true,
});

