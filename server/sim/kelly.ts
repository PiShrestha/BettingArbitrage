export interface KellyParams {
  bankroll: number;
  winProbability: number;
  oddsDecimal: number;
  fraction?: number;
  maxStakePercent?: number;
  maxStakeAbsolute?: number;
}

const DEFAULT_FRACTION = 0.25;

export function kellyStake({
  bankroll,
  winProbability,
  oddsDecimal,
  fraction = DEFAULT_FRACTION,
  maxStakePercent,
  maxStakeAbsolute,
}: KellyParams): number {
  if (bankroll <= 0) return 0;
  const b = oddsDecimal - 1;
  if (b <= 0) return 0;

  const kellyFraction = (b * winProbability - (1 - winProbability)) / b;
  const scaledFraction = Math.max(0, kellyFraction * fraction);
  let stake = scaledFraction * bankroll;

  if (typeof maxStakePercent === "number") {
    stake = Math.min(stake, (maxStakePercent / 100) * bankroll);
  }

  if (typeof maxStakeAbsolute === "number") {
    stake = Math.min(stake, maxStakeAbsolute);
  }

  return Math.max(0, Number(stake.toFixed(2)));
}
