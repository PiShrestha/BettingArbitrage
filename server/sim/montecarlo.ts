import { kellyStake } from "./kelly";
import { mean, standardDeviation } from "./metrics";

export interface StrategyInput {
  bankroll: number;
  index: number;
}

export interface StrategyDecision {
  stakeAmount: number;
  oddsDecimal: number;
  winProbability: number;
}

export type StrategyFunction = (input: StrategyInput) => StrategyDecision;

export interface MonteCarloOptions {
  simulations?: number;
  stepsPerSimulation?: number;
  startingBankroll?: number;
  strategy?: StrategyFunction;
  defaultOdds?: number;
  defaultWinProbability?: number;
  kellyFraction?: number;
}

export interface MonteCarloResultSummary {
  finalBankrolls: number[];
  meanFinalBankroll: number;
  medianFinalBankroll: number;
  standardDeviation: number;
  probabilityOfLoss: number;
  probabilityOfRuin: number;
  percentile10: number;
  percentile90: number;
}

const DEFAULT_MONTE_CARLO_OPTIONS: Required<MonteCarloOptions> = {
  simulations: 1000,
  stepsPerSimulation: 250,
  startingBankroll: 10000,
  strategy: ({ bankroll }) => ({
    stakeAmount: 0,
    oddsDecimal: 2,
    winProbability: 0.5,
  }),
  defaultOdds: 2,
  defaultWinProbability: 0.5,
  kellyFraction: 0.25,
};

function defaultStrategyFactory(
  options: Required<MonteCarloOptions>
): StrategyFunction {
  return ({ bankroll }) => {
    const decision = kellyStake({
      bankroll,
      winProbability: options.defaultWinProbability,
      oddsDecimal: options.defaultOdds,
      fraction: options.kellyFraction,
    });
    return {
      stakeAmount: decision,
      oddsDecimal: options.defaultOdds,
      winProbability: options.defaultWinProbability,
    };
  };
}

function simulatePath(
  options: Required<MonteCarloOptions>,
  strategy: StrategyFunction
): number {
  let bankroll = options.startingBankroll;
  for (let step = 0; step < options.stepsPerSimulation; step += 1) {
    const decision = strategy({ bankroll, index: step });
    const stake = Math.min(decision.stakeAmount, bankroll);
    if (stake <= 0) {
      continue;
    }

    bankroll -= stake;
    const win = Math.random() < decision.winProbability;
    if (win) {
      bankroll += stake * decision.oddsDecimal;
    }
  }
  return Number(bankroll.toFixed(2));
}

function percentile(values: number[], percentileRank: number): number {
  if (!values.length) return 0;
  const index = (values.length - 1) * percentileRank;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return values[lower];
  }
  const weight = index - lower;
  return values[lower] * (1 - weight) + values[upper] * weight;
}

export function runMonteCarlo(
  options: MonteCarloOptions = {}
): MonteCarloResultSummary {
  const resolved: Required<MonteCarloOptions> = {
    ...DEFAULT_MONTE_CARLO_OPTIONS,
    ...options,
  };

  const strategy = options.strategy || defaultStrategyFactory(resolved);

  const paths: number[] = [];
  for (let sim = 0; sim < resolved.simulations; sim += 1) {
    const finalBankroll = simulatePath(resolved, strategy);
    paths.push(finalBankroll);
  }

  const sorted = [...paths].sort((a, b) => a - b);
  const meanValue = mean(paths);
  const std = standardDeviation(paths);
  const median = percentile(sorted, 0.5);
  const pLoss =
    paths.filter((value) => value < resolved.startingBankroll).length /
    paths.length;
  const pRuin =
    paths.filter((value) => value < resolved.startingBankroll * 0.5).length /
    paths.length;

  return {
    finalBankrolls: paths,
    meanFinalBankroll: Number(meanValue.toFixed(2)),
    medianFinalBankroll: Number(median.toFixed(2)),
    standardDeviation: Number(std.toFixed(2)),
    probabilityOfLoss: Number(pLoss.toFixed(4)),
    probabilityOfRuin: Number(pRuin.toFixed(4)),
    percentile10: Number(percentile(sorted, 0.1).toFixed(2)),
    percentile90: Number(percentile(sorted, 0.9).toFixed(2)),
  };
}
