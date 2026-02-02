export const formatInteger = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

export const formatCurrency = (currency: string, value: number) => {
  const sign = value < 0 ? "-" : "";
  return `${sign}${currency}${formatInteger(Math.abs(value))}`;
};

export const formatPercent = (value: number, fractionDigits = 1) =>
  `${(value * 100).toFixed(fractionDigits)}%`;

export const formatMillions = (currency: string, value: number) =>
  `${value < 0 ? "-" : ""}${currency}${formatInteger(Math.abs(value) / 1_000_000)}m`;

