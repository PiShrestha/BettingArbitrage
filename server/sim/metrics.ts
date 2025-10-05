export function returnsFromEquityCurve(equityCurve: number[]): number[] {
  if (equityCurve.length <= 1) return [];
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const previous = equityCurve[i - 1];
    const current = equityCurve[i];
    if (previous <= 0) {
      returns.push(0);
      continue;
    }
    returns.push((current - previous) / previous);
  }
  return returns;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = mean(values.map((value) => (value - m) ** 2));
  return Math.sqrt(variance);
}

export interface SharpeRatioOptions {
  riskFreeRate?: number;
  periodsPerYear?: number;
}

const DEFAULT_SHARPE_OPTIONS: Required<SharpeRatioOptions> = {
  riskFreeRate: 0,
  periodsPerYear: 252,
};

export function sharpeRatio(
  equityCurve: number[],
  options: SharpeRatioOptions = {}
): number {
  const { riskFreeRate, periodsPerYear } = {
    ...DEFAULT_SHARPE_OPTIONS,
    ...options,
  };
  const returns = returnsFromEquityCurve(equityCurve);
  if (!returns.length) return 0;

  const excessReturns = returns.map((r) => r - riskFreeRate / periodsPerYear);
  const meanExcess = mean(excessReturns);
  const std = standardDeviation(excessReturns);
  if (std === 0) return 0;
  return (meanExcess / std) * Math.sqrt(periodsPerYear);
}

export function maxDrawdown(equityCurve: number[]): number {
  let peak = -Infinity;
  let maxDraw = 0;
  for (const equity of equityCurve) {
    if (equity > peak) {
      peak = equity;
    }
    const drawdown = (peak - equity) / peak;
    if (drawdown > maxDraw) {
      maxDraw = drawdown;
    }
  }
  return maxDraw;
}
