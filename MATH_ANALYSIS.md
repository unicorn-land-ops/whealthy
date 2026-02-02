# Math Analysis for Wealth Simulation

## Current Implementation Analysis

### 1. Return Calculation (Lines 184-209)

**Base for Return Calculation:**
```typescript
baseForReturn = Math.max(0, wealth - 0.5 * totalOutflowsPreTax + 0.5 * totalInflowsPreTax)
```
- Uses mid-year approximation (reasonable)
- Assumes outflows/inflows happen evenly throughout year

**Return Components:**
- `publicReturn = params.assetReturn.public` (total return, e.g., 6%)
- `publicDivYield = params.publicDivYield` (dividend yield, e.g., 2%)
- `publicPriceReturn = Math.max(0, publicReturn - publicDivYield)` (price appreciation, e.g., 4%)
- `publicRealized = params.publicRealizationRate * publicPriceReturn` (realized gains)
- `cashReturn = params.assetReturn.cash` (interest rate, e.g., 3%)
- `privateReturn = params.assetReturn.private` (private equity return, e.g., 11%)
- `privateRealized = params.privateRealizationRate * Math.max(0, privateReturn)`

**Gross Return:**
```typescript
grossReturn = allocation.public * publicReturn + 
              allocation.private * privateReturn + 
              allocation.cash * cashReturn
```
This is correct - weighted average return.

**Net Return:**
```typescript
netReturn = baseForReturn * grossReturn - taxes
```
This applies the gross return to the base, then subtracts taxes. This is correct IF taxes are calculated correctly.

### 2. Tax Calculation (Lines 120-147)

**Tax on Dividends:**
```typescript
taxOnDiv = publicBase * publicDivYield * params.taxDividends
```
✅ Correct - taxes dividend income

**Tax on Public Realized Gains:**
```typescript
taxOnPublicRealized = publicBase * publicRealized * params.taxRealizedGains
```
✅ Correct - taxes realized capital gains

**Tax on Cash Interest:**
```typescript
taxOnCash = cashBase * cashReturn * params.taxInterest
```
✅ Correct - taxes interest income

**Tax on Private Realized:**
```typescript
taxOnPrivate = privateBase * privateRealized * params.taxRealizedGains
```
✅ Correct - taxes private realized gains

**Total Taxes:**
```typescript
taxes = taxOnDiv + taxOnPublicRealized + taxOnCash + taxOnPrivate
```
✅ Correct - sums all tax components

### 3. Wealth Update (Line 211)

```typescript
wealth = wealth + totalInflowsPreTax + netReturn - totalOutflowsPreTax
```
✅ Correct - adds inflows and net return, subtracts outflows

### 4. Liquid Wealth Calculation (Lines 213-228)

**ISSUE IDENTIFIED:**

```typescript
liquidReturn = baseForReturn * (allocation.public * publicReturn + allocation.cash * cashReturn)
liquidAfter = liquidBefore + totalInflowsPreTax - privateCall - expense - philanthropy - oneOffs.outflows + liquidReturn - taxes
```

**Problem:** The `taxes` variable includes taxes on ALL assets (public, private, cash), but liquid wealth should only pay taxes on liquid assets (public + cash). Currently, liquid wealth is being reduced by taxes on private assets too, which is incorrect.

**Fix Needed:** Calculate taxes separately for liquid vs. illiquid assets, or calculate liquid taxes as a proportion.

### 5. Returns Breakdown - MISSING

Currently, the simulation only tracks `netReturn` as a single value. The user wants to see:
- Dividend income (publicDivYield * publicBase)
- Interest income (cashReturn * cashBase)
- Capital gains (realized and unrealized)
- Private returns breakdown

These components are calculated internally but not exposed in the results.

## Issues Found

1. **Liquid Wealth Tax Issue**: Liquid wealth was being reduced by taxes on private assets, which is incorrect. ✅ FIXED

2. **Missing Returns Breakdown**: No visibility into dividend income, interest income, or capital gains separately. ✅ FIXED

3. **Returns Not Explicitly Shown**: While returns were calculated and reinvested, they weren't broken down in the display. ✅ FIXED

## Fixes Implemented

1. ✅ **Fixed Liquid Wealth Tax Calculation**: 
   - Created `computeLiquidTaxes()` function that only calculates taxes on liquid assets (public + cash)
   - Updated liquid wealth calculation to use `liquidTaxes` instead of full `taxes`
   - This ensures liquid wealth is only reduced by taxes on liquid assets

2. ✅ **Added Return Breakdown Fields**:
   - Extended `SimulationRow` type with:
     - `dividendIncome`: Dividend income from public equities
     - `interestIncome`: Interest income from cash
     - `publicRealizedGains`: Realized capital gains on public equities
     - `publicUnrealizedGains`: Unrealized capital gains on public equities
     - `privateRealizedGains`: Realized gains on private investments
     - `privateUnrealizedGains`: Unrealized gains on private investments
     - `grossReturnPct`: Gross return percentage (before taxes)
     - `netReturnPct`: Net return percentage (after taxes)

3. ✅ **Updated Results Table**:
   - Added all return breakdown columns to the results table
   - Properly formatted percentages and currency values
   - Users can now see exactly how returns are composed

4. ✅ **Return Calculation Verification**:
   - All returns are properly calculated and reinvested
   - Dividends and interest are included in the gross return calculation
   - Returns are correctly applied to the base wealth and reinvested
   - Tax calculations are accurate and applied correctly

## Math Verification Summary

✅ **Return Calculation**: Correct
- Gross return is weighted average of asset class returns
- Dividends and interest are included in total returns
- Returns are applied to mid-year base and reinvested

✅ **Tax Calculation**: Correct
- Taxes calculated on actual income (dividends, interest, realized gains)
- Different tax rates applied correctly to different income types
- Liquid wealth taxes calculated separately (only on liquid assets)

✅ **Wealth Update**: Correct
- Wealth = previous wealth + inflows + net return - outflows
- All returns are reinvested (included in netReturn)
- Mid-year approximation for base calculation is reasonable

✅ **Liquid Wealth**: Fixed
- Now correctly calculates taxes only on liquid assets
- Liquid wealth properly tracks public + cash assets only

