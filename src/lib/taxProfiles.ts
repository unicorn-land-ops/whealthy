import { Params } from "./types";

export type TaxResidenceCountry = "us" | "uk" | "germany" | "france";

export type TaxResidenceCountryDefinition = {
  id: TaxResidenceCountry;
  label: string;
  assumptions: string[];
  customRates?: {
    taxInterest: number;
    taxDividends: number;
    taxRealizedGains: number;
  };
  holdingPatch?: Partial<Params["holdingCompanyStructure"]>;
};

export const TAX_RESIDENCE_COUNTRIES: TaxResidenceCountryDefinition[] = [
  {
    id: "us",
    label: "US",
    assumptions: [
      "US baseline uses 21% federal corporate tax in US-only mode.",
      "If combined with Germany, US withholding applies to US-source public dividends.",
      "No US state tax modeled.",
    ],
    customRates: {
      taxInterest: 0.21,
      taxDividends: 0.21,
      taxRealizedGains: 0.21,
    },
    holdingPatch: {
      usCorporateTaxRate: 0.21,
      publicDividendSource: "us",
      privateDividendSource: "us",
      usOwnershipPct: 0.1,
    },
  },
  {
    id: "uk",
    label: "UK",
    assumptions: [
      "UK currently uses simplified placeholder effective rates.",
      "Treaty relief, allowances, and entity-specific nuances are not modeled yet.",
    ],
    customRates: {
      taxInterest: 0.25,
      taxDividends: 0.25,
      taxRealizedGains: 0.25,
    },
    holdingPatch: {
      publicDividendSource: "other",
      privateDividendSource: "other",
    },
  },
  {
    id: "germany",
    label: "Germany",
    assumptions: [
      "German holding-company logic enabled when Germany is selected.",
      "Defaults to Vermögensverwaltende structure (no Gewerbesteuer).",
      "Dividend treatment uses 95% exemption at qualifying ownership thresholds.",
    ],
    customRates: {
      taxInterest: 0.25,
      taxDividends: 0.25,
      taxRealizedGains: 0.25,
    },
    holdingPatch: {
      germanOwnershipPct: 0.1,
      isVermoegensverwaltend: true,
      germanTradeTaxRate: 0.14,
      publicDividendSource: "germany",
      privateDividendSource: "germany",
    },
  },
  {
    id: "france",
    label: "France",
    assumptions: [
      "France currently uses simplified placeholder effective rates.",
      "No surtaxes, social contributions, or regime-specific exemptions modeled yet.",
    ],
    customRates: {
      taxInterest: 0.28,
      taxDividends: 0.28,
      taxRealizedGains: 0.28,
    },
    holdingPatch: {
      publicDividendSource: "other",
      privateDividendSource: "other",
    },
  },
];

export const getTaxResidenceCountry = (id: TaxResidenceCountry): TaxResidenceCountryDefinition => {
  return TAX_RESIDENCE_COUNTRIES.find((country) => country.id === id) ?? TAX_RESIDENCE_COUNTRIES[0];
};

export const deriveTaxSetupFromResidences = (
  residences: TaxResidenceCountry[],
  weights?: Partial<Record<TaxResidenceCountry, number>>,
  doubleTaxRelief: number = 0.5,
): {
  taxJurisdiction: Params["taxJurisdiction"];
  taxInterest: number;
  taxDividends: number;
  taxRealizedGains: number;
  holdingCompanyStructurePatch: Partial<Params["holdingCompanyStructure"]>;
  assumptions: string[];
} => {
  const unique = Array.from(new Set(residences));
  const hasGermany = unique.includes("germany");
  const hasUS = unique.includes("us");

  let taxJurisdiction: Params["taxJurisdiction"] = "custom";
  if (hasGermany && hasUS) taxJurisdiction = "germany-us";
  else if (hasGermany) taxJurisdiction = "germany";
  else if (hasUS && unique.length === 1) taxJurisdiction = "us";

  const selectedDefs = unique.map(getTaxResidenceCountry);

  const selectedWithRates = selectedDefs.filter(
    (d): d is TaxResidenceCountryDefinition & { customRates: NonNullable<TaxResidenceCountryDefinition["customRates"]> } =>
      Boolean(d.customRates),
  );

  const baseWeights = selectedWithRates.map((d) => Math.max(0, weights?.[d.id] ?? 0));
  const weightSum = baseWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weightSum > 0
    ? baseWeights.map((w) => w / weightSum)
    : selectedWithRates.map(() => 1 / Math.max(1, selectedWithRates.length));

  const weighted = (getter: (item: NonNullable<TaxResidenceCountryDefinition["customRates"]>) => number) => {
    if (!selectedWithRates.length) return 0.25;
    return selectedWithRates.reduce((sum, def, index) => {
      return sum + getter(def.customRates) * normalizedWeights[index];
    }, 0);
  };

  const overlapFactor = Math.max(0, (unique.length - 1) / Math.max(1, unique.length));
  const reliefMultiplier = 1 - Math.max(0, Math.min(1, doubleTaxRelief)) * overlapFactor;

  const taxInterest = weighted((r) => r.taxInterest) * reliefMultiplier;
  const taxDividends = weighted((r) => r.taxDividends) * reliefMultiplier;
  const taxRealizedGains = weighted((r) => r.taxRealizedGains) * reliefMultiplier;

  const holdingCompanyStructurePatch = selectedDefs.reduce<Partial<Params["holdingCompanyStructure"]>>(
    (acc, def) => ({ ...acc, ...(def.holdingPatch ?? {}) }),
    {},
  );

  const assumptions = selectedDefs.flatMap((d) => d.assumptions);

  return {
    taxJurisdiction,
    taxInterest,
    taxDividends,
    taxRealizedGains,
    holdingCompanyStructurePatch,
    assumptions,
  };
};
