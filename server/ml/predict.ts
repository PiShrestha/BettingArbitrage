import * as tf from "@tensorflow/tfjs-node";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  HistoricalOddsSample,
  buildFeatureVector,
  standardizeMatrix,
  StandardizationStats,
} from "./features";

export interface LoadedOutcomeModel {
  model: tf.LayersModel;
  stats: StandardizationStats;
}

export async function loadOutcomeModel(
  modelPath: string
): Promise<LoadedOutcomeModel> {
  const model = await tf.loadLayersModel(modelPath);
  const stats = await loadStats(modelPath);
  return { model, stats };
}

async function loadStats(modelPath: string): Promise<StandardizationStats> {
  if (!modelPath.startsWith("file://")) {
    throw new Error("Model path must use file:// protocol to load stats");
  }
  const url = new URL(modelPath);
  const statsPath = join(url.pathname, "stats.json");
  const raw = await readFile(statsPath, "utf-8");
  const parsed = JSON.parse(raw) as StandardizationStats;
  if (!Array.isArray(parsed.mean) || !Array.isArray(parsed.std)) {
    throw new Error("Invalid stats.json format");
  }
  return parsed;
}

export function predictWinProbability(
  model: tf.LayersModel,
  stats: StandardizationStats,
  sample: HistoricalOddsSample
): number {
  const featureVector = buildFeatureVector(sample);
  const standardized = standardizeMatrix([featureVector], stats);
  const tensor = tf.tensor2d(standardized);
  const prediction = model.predict(tensor) as tf.Tensor;
  const data = prediction.dataSync();
  const value = data[0];
  tensor.dispose();
  prediction.dispose();
  return Number(value.toFixed(4));
}

export function predictBatch(
  model: tf.LayersModel,
  stats: StandardizationStats,
  samples: HistoricalOddsSample[]
): number[] {
  if (!samples.length) return [];
  const matrix = samples.map((sample) => buildFeatureVector(sample));
  const standardized = standardizeMatrix(matrix, stats);
  const tensor = tf.tensor2d(standardized);
  const prediction = model.predict(tensor) as tf.Tensor;
  const data = prediction.dataSync();
  tensor.dispose();
  prediction.dispose();
  return Array.from(data).map((value) => Number(value.toFixed(4)));
}
