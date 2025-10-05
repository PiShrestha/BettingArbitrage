import { kellyStake } from "./kelly";
import { maxDrawdown, sharpeRatio } from "./metrics";

export type BetOutcome = "win" | "lose" | "push";

export interface SimulatedBet {
  id?: string;
  eventId?: string;
  marketName?: string;
  runnerName?: string;
  oddsDecimal: number;
  result: BetOutcome;
  stakeAmount?: number;
  winProbability?: number;
  placedAt?: string;
  settledAt?: string;
}

export interface BacktestOptions {
  startingBankroll?: number;
  useKellyWhenStakeMissing?: boolean;
  kellyFraction?: number;
  maxStakePercent?: number;
  maxStakeAbsolute?: number;
}

export interface BacktestResult {
  finalBankroll: number;
  equityCurve: number[];
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  profit: number;
  sharpe: number;
  maxDrawdown: number;
}

const DEFAULT_BACKTEST_OPTIONS: Required<BacktestOptions> = {
  startingBankroll: 1000,
  useKellyWhenStakeMissing: true,
  kellyFraction: 0.25,
  maxStakePercent: 5,
  maxStakeAbsolute: Number.POSITIVE_INFINITY,
};

function resolveStakeAmount(
  bet: SimulatedBet,
  bankroll: number,
  options: Required<BacktestOptions>
): number {
  if (typeof bet.stakeAmount === "number") {
    return bet.stakeAmount;
  }
  if (
    !options.useKellyWhenStakeMissing ||
    typeof bet.winProbability !== "number"
  ) {
    return Math.min(
      (options.maxStakePercent / 100) * bankroll,
      options.maxStakeAbsolute
    );
  }

  return kellyStake({
    bankroll,
    winProbability: bet.winProbability,
    oddsDecimal: bet.oddsDecimal,
    fraction: options.kellyFraction,
    maxStakePercent: options.maxStakePercent,
    maxStakeAbsolute: options.maxStakeAbsolute,
  });
}

export function backtestBets(
  bets: SimulatedBet[],
  options: BacktestOptions = {}
): BacktestResult {
  const resolvedOptions: Required<BacktestOptions> = {
    ...DEFAULT_BACKTEST_OPTIONS,
    ...options,
  };

  let bankroll = resolvedOptions.startingBankroll;
  const equityCurve: number[] = [bankroll];
  let wins = 0;
  let losses = 0;
  let pushes = 0;

  for (const bet of bets) {
    const stake = resolveStakeAmount(bet, bankroll, resolvedOptions);
    if (stake <= 0) {
      equityCurve.push(bankroll);
      continue;
    }
    bankroll -= stake;

    if (bet.result === "push") {
      bankroll += stake;
      pushes += 1;
    } else if (bet.result === "win") {
      bankroll += stake * bet.oddsDecimal;
      wins += 1;
    } else {
      losses += 1;
    }

    equityCurve.push(Number(bankroll.toFixed(2)));
  }

  const profit = bankroll - resolvedOptions.startingBankroll;
  const sharpe = sharpeRatio(equityCurve);
  const drawdown = maxDrawdown(equityCurve);

  return {
    finalBankroll: Number(bankroll.toFixed(2)),
    equityCurve,
    totalBets: bets.length,
    wins,
    losses,
    pushes,
    profit: Number(profit.toFixed(2)),
    sharpe,
    maxDrawdown: drawdown,
  };
}
