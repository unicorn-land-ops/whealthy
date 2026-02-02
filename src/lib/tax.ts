import { Params } from "./types";

/**
 * German corporate tax rates (2024)
 * - Körperschaftsteuer (Corporate Income Tax): 15%
 * - Solidaritätszuschlag (Solidarity Surcharge): 5.5% of corporate tax
 * - Gewerbesteuer (Trade Tax): varies by municipality, typically 14-17%
 */
const GERMAN_CORPORATE_TAX_RATE = 0.15;
const GERMAN_SOLIDARITY_SURCHARGE = 0.055; // 5.5% of corporate tax
const GERMAN_DIVIDEND_EXEMPTION_RATE = 0.95; // 95% of dividends are exempt
const GERMAN_MIN_OWNERSHIP_FOR_EXEMPTION = 0.10; // 10% minimum for corporate tax exemption
const GERMAN_MIN_OWNERSHIP_FOR_TRADE_TAX_EXEMPTION = 0.15; // 15% minimum for trade tax exemption

/**
 * US corporate tax rates (2024)
 * - Federal Corporate Tax: 21%
 */
const US_CORPORATE_TAX_RATE = 0.21;
const US_DIVIDEND_WITHHOLDING_STANDARD = 0.30; // 30% standard withholding
const US_DIVIDEND_WITHHOLDING_TREATY_10PCT = 0.05; // 5% if ≥10% ownership
const US_DIVIDEND_WITHHOLDING_TREATY_80PCT = 0.00; // 0% if ≥80% ownership
const US_MIN_OWNERSHIP_FOR_5PCT = 0.10; // 10% for 5% withholding
const US_MIN_OWNERSHIP_FOR_0PCT = 0.80; // 80% for 0% withholding

/**
 * Calculate effective German corporate tax rate including all components
 * Vermögensverwaltende Gesellschaften are exempt from Gewerbesteuer
 */
export const calculateGermanCorporateTaxRate = (
  tradeTaxRate: number,
  isVermoegensverwaltend: boolean = true,
): number => {
  // Corporate tax: 15%
  // Solidarity surcharge: 5.5% of 15% = 0.825%
  // Trade tax: varies (typically 14-17%) - EXEMPT for Vermögensverwaltende Gesellschaften
  const corporateTax = GERMAN_CORPORATE_TAX_RATE;
  const solidaritySurcharge = GERMAN_CORPORATE_TAX_RATE * GERMAN_SOLIDARITY_SURCHARGE;
  const tradeTax = isVermoegensverwaltend ? 0 : tradeTaxRate;
  return corporateTax + solidaritySurcharge + tradeTax;
};

/**
 * Calculate US withholding tax on dividends based on ownership percentage
 */
export const calculateUSDividendWithholdingTax = (
  ownershipPct: number,
): number => {
  if (ownershipPct >= US_MIN_OWNERSHIP_FOR_0PCT) {
    return US_DIVIDEND_WITHHOLDING_TREATY_80PCT;
  } else if (ownershipPct >= US_MIN_OWNERSHIP_FOR_5PCT) {
    return US_DIVIDEND_WITHHOLDING_TREATY_10PCT;
  }
  return US_DIVIDEND_WITHHOLDING_STANDARD;
};

/**
 * Calculate German tax on dividends received by holding company
 * Applies 95% exemption if ownership requirements are met
 * Vermögensverwaltende Gesellschaften are exempt from Gewerbesteuer
 */
export const calculateGermanDividendTax = (
  dividendAmount: number,
  ownershipPct: number,
  tradeTaxRate: number,
  isVermoegensverwaltend: boolean = true,
): number => {
  // Check if ownership meets minimum for exemption
  const qualifiesForExemption = ownershipPct >= GERMAN_MIN_OWNERSHIP_FOR_EXEMPTION;
  const qualifiesForTradeTaxExemption = ownershipPct >= GERMAN_MIN_OWNERSHIP_FOR_TRADE_TAX_EXEMPTION;

  if (!qualifiesForExemption) {
    // No exemption, full tax
    const effectiveRate = calculateGermanCorporateTaxRate(tradeTaxRate, isVermoegensverwaltend);
    return dividendAmount * effectiveRate;
  }

  // 95% exemption: only 5% of dividend is taxable
  const taxableDividend = dividendAmount * (1 - GERMAN_DIVIDEND_EXEMPTION_RATE);

  // Corporate tax and solidarity surcharge apply to taxable portion
  const corporateTax = taxableDividend * GERMAN_CORPORATE_TAX_RATE;
  const solidaritySurcharge = corporateTax * GERMAN_SOLIDARITY_SURCHARGE;

  // Trade tax: exempt for Vermögensverwaltende Gesellschaften
  // If not Vermögensverwaltend, exemption if ownership ≥15%
  let tradeTax = 0;
  if (!isVermoegensverwaltend) {
    tradeTax = qualifiesForTradeTaxExemption
      ? taxableDividend * tradeTaxRate // Only on 5% taxable portion
      : dividendAmount * tradeTaxRate; // Full amount if no exemption
  }

  return corporateTax + solidaritySurcharge + tradeTax;
};

/**
 * Calculate comprehensive taxes for a holding company structure
 * Handles German, US, and combined jurisdictions
 */
export const computeHoldingCompanyTaxes = ({
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
  allocation: Params["assetAlloc"];
  publicDivYield: number;
  publicRealized: number;
  cashReturn: number;
  privateRealized: number;
}): number => {
  // Use custom tax rates if jurisdiction is "custom"
  if (params.taxJurisdiction === "custom") {
    return computeCustomTaxes({
      params,
      baseForReturn,
      allocation,
      publicDivYield,
      publicRealized,
      cashReturn,
      privateRealized,
    });
  }

  const publicBase = baseForReturn * allocation.public;
  const cashBase = baseForReturn * allocation.cash;
  const privateBase = baseForReturn * allocation.private;

  const holding = params.holdingCompanyStructure;

  let totalTax = 0;

  // Calculate dividend income (only public equity dividends)
  const publicDividendIncome = publicBase * publicDivYield;

  // Calculate interest income
  const interestIncome = cashBase * cashReturn;

  // Calculate realized capital gains
  const publicRealizedGains = publicBase * publicRealized;
  // Private equity distributions are treated as capital gains (not dividends)
  const privateRealizedGains = privateBase * privateRealized;

  // Process based on jurisdiction
  if (params.taxJurisdiction === "germany" || params.taxJurisdiction === "germany-us") {
    // German corporate tax on dividends (95% exemption if ownership requirements met)
    // Apply German tax to all dividend sources (including "other")
    const publicDividendTax = calculateGermanDividendTax(
      publicDividendIncome,
      holding.germanOwnershipPct,
      holding.germanTradeTaxRate,
      holding.isVermoegensverwaltend,
    );

    // German tax on interest (no exemption)
    const effectiveGermanRate = calculateGermanCorporateTaxRate(
      holding.germanTradeTaxRate,
      holding.isVermoegensverwaltend,
    );
    const interestTax = interestIncome * effectiveGermanRate;

    // German tax on realized capital gains (no exemption for capital gains)
    // Both public and private capital gains are fully taxable
    const publicGainsTax = publicRealizedGains * effectiveGermanRate;
    const privateGainsTax = privateRealizedGains * effectiveGermanRate;

    totalTax += publicDividendTax + interestTax + publicGainsTax + privateGainsTax;

    // Apply US withholding tax if dividends are from US sources
    // "Other" sources use German tax treatment only (no US withholding)
    if (params.taxJurisdiction === "germany-us") {
      if (holding.publicDividendSource === "us") {
        const usWithholding = publicDividendIncome * calculateUSDividendWithholdingTax(holding.usOwnershipPct);
        totalTax += usWithholding;
      }
      // Note: Private distributions are capital gains, not dividends, so no US withholding applies
    }
  } else if (params.taxJurisdiction === "us") {
    // US corporate tax on all income
    const dividendIncome = publicDividendIncome; // Only public dividends, private is capital gains
    const allIncome = dividendIncome + interestIncome + publicRealizedGains + privateRealizedGains;
    totalTax = allIncome * holding.usCorporateTaxRate;
  }

  return Math.max(0, totalTax);
};

/**
 * Legacy tax calculation (for custom jurisdiction)
 */
const computeCustomTaxes = ({
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
  allocation: Params["assetAlloc"];
  publicDivYield: number;
  publicRealized: number;
  cashReturn: number;
  privateRealized: number;
}): number => {
  const publicBase = baseForReturn * allocation.public;
  const cashBase = baseForReturn * allocation.cash;
  const privateBase = baseForReturn * allocation.private;

  const taxOnDiv = publicBase * publicDivYield * params.taxDividends;
  const taxOnPublicRealized = publicBase * publicRealized * params.taxRealizedGains;
  const taxOnCash = cashBase * cashReturn * params.taxInterest;
  const taxOnPrivate = privateBase * privateRealized * params.taxRealizedGains;

  return Math.max(0, taxOnDiv + taxOnPublicRealized + taxOnCash + taxOnPrivate);
};

/**
 * Calculate taxes only on liquid assets (public + cash)
 * Used for liquid wealth calculation
 */
export const computeLiquidHoldingCompanyTaxes = ({
  params,
  baseForReturn,
  allocation,
  publicDivYield,
  publicRealized,
  cashReturn,
}: {
  params: Params;
  baseForReturn: number;
  allocation: Params["assetAlloc"];
  publicDivYield: number;
  publicRealized: number;
  cashReturn: number;
}): number => {
  // Use custom tax rates if jurisdiction is "custom"
  if (params.taxJurisdiction === "custom") {
    return computeLiquidCustomTaxes({
      params,
      baseForReturn,
      allocation,
      publicDivYield,
      publicRealized,
      cashReturn,
    });
  }

  const publicBase = baseForReturn * allocation.public;
  const cashBase = baseForReturn * allocation.cash;

  const holding = params.holdingCompanyStructure;

  let totalTax = 0;

  const publicDividendIncome = publicBase * publicDivYield;
  const interestIncome = cashBase * cashReturn;
  const publicRealizedGains = publicBase * publicRealized;

  if (params.taxJurisdiction === "germany" || params.taxJurisdiction === "germany-us") {
    const publicDividendTax = calculateGermanDividendTax(
      publicDividendIncome,
      holding.germanOwnershipPct,
      holding.germanTradeTaxRate,
      holding.isVermoegensverwaltend,
    );

    const effectiveGermanRate = calculateGermanCorporateTaxRate(
      holding.germanTradeTaxRate,
      holding.isVermoegensverwaltend,
    );
    const interestTax = interestIncome * effectiveGermanRate;
    const publicGainsTax = publicRealizedGains * effectiveGermanRate;

    totalTax += publicDividendTax + interestTax + publicGainsTax;

    // US withholding if applicable (only on US-source dividends, "other" uses German tax only)
    if (params.taxJurisdiction === "germany-us" && holding.publicDividendSource === "us") {
      const usWithholding = publicDividendIncome * calculateUSDividendWithholdingTax(holding.usOwnershipPct);
      totalTax += usWithholding;
    }
  } else if (params.taxJurisdiction === "us") {
    const allIncome = publicDividendIncome + interestIncome + publicRealizedGains;
    totalTax = allIncome * holding.usCorporateTaxRate;
  }

  return Math.max(0, totalTax);
};

/**
 * Legacy liquid tax calculation (for custom jurisdiction)
 */
const computeLiquidCustomTaxes = ({
  params,
  baseForReturn,
  allocation,
  publicDivYield,
  publicRealized,
  cashReturn,
}: {
  params: Params;
  baseForReturn: number;
  allocation: Params["assetAlloc"];
  publicDivYield: number;
  publicRealized: number;
  cashReturn: number;
}): number => {
  const publicBase = baseForReturn * allocation.public;
  const cashBase = baseForReturn * allocation.cash;

  const taxOnDiv = publicBase * publicDivYield * params.taxDividends;
  const taxOnPublicRealized = publicBase * publicRealized * params.taxRealizedGains;
  const taxOnCash = cashBase * cashReturn * params.taxInterest;

  return Math.max(0, taxOnDiv + taxOnPublicRealized + taxOnCash);
};

