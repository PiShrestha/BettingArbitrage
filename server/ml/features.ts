import { Market } from "@shared/schema";

export interface HistoricalOddsSample {
  market: Market;
  runnerConsensusProbability: number;
  impliedProbability: number;
  closingProbability: number;
  homeTeamElo?: number;
  awayTeamElo?: number;
  timeToStartMinutes: number;
  label: 0 | 1;
}

export function buildFeatureVector(sample: HistoricalOddsSample): number[] {
  const features: number[] = [];
  const { market } = sample;
  const odds = market.oddsDecimal;

  features.push(odds);
  features.push(sample.impliedProbability);
  features.push(sample.runnerConsensusProbability);
  features.push(sample.closingProbability);
  features.push(sample.timeToStartMinutes);

  if (
    typeof sample.homeTeamElo === "number" &&
    typeof sample.awayTeamElo === "number"
  ) {
    features.push(sample.homeTeamElo - sample.awayTeamElo);
    features.push(sample.homeTeamElo + sample.awayTeamElo);
  } else {
    features.push(0);
    features.push(0);
  }

  const isHomeTeam = market.runner.name === market.additionalMetadata?.homeTeam;
  features.push(isHomeTeam ? 1 : 0);

  return features;
}

export function buildFeatureMatrix(
  samples: HistoricalOddsSample[]
): number[][] {
  return samples.map((sample) => buildFeatureVector(sample));
}

export function buildLabelVector(samples: HistoricalOddsSample[]): number[] {
  return samples.map((sample) => sample.label);
}

export interface StandardizationStats {
  mean: number[];
  std: number[];
}

export function computeStandardizationStats(
  matrix: number[][]
): StandardizationStats {
  if (!matrix.length) {
    return { mean: [], std: [] };
  }

  const dimension = matrix[0].length;
  const mean = new Array(dimension).fill(0);
  const std = new Array(dimension).fill(0);

  for (const row of matrix) {
    row.forEach((value, index) => {
      mean[index] += value;
    });
  }

  for (let i = 0; i < dimension; i += 1) {
    mean[i] /= matrix.length;
  }

  for (const row of matrix) {
    row.forEach((value, index) => {
      const diff = value - mean[index];
      std[index] += diff * diff;
    });
  }

  for (let i = 0; i < dimension; i += 1) {
    std[i] = Math.sqrt(std[i] / Math.max(matrix.length - 1, 1));
    if (!Number.isFinite(std[i]) || std[i] === 0) {
      std[i] = 1;
    }
  }

  return { mean, std };
}

export function standardizeMatrix(
  matrix: number[][],
  stats: StandardizationStats
): number[][] {
  return matrix.map((row) =>
    row.map((value, index) => (value - stats.mean[index]) / stats.std[index])
  );
}
