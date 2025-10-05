import * as tf from "@tensorflow/tfjs-node";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  HistoricalOddsSample,
  buildFeatureMatrix,
  buildLabelVector,
  computeStandardizationStats,
  standardizeMatrix,
  StandardizationStats,
} from "./features";

export interface TrainOptions {
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
  learningRate?: number;
  modelSavePath?: string;
}

export interface TrainingArtifacts {
  model: tf.LayersModel;
  stats: StandardizationStats;
  history: tf.History | null;
}

const DEFAULT_OPTIONS: Required<TrainOptions> = {
  epochs: 25,
  batchSize: 128,
  validationSplit: 0.1,
  learningRate: 1e-3,
  modelSavePath: "file://./server/ml/models/outcome-model",
};

function buildModel(inputSize: number, learningRate: number): tf.LayersModel {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      units: 64,
      activation: "relu",
      inputShape: [inputSize],
    })
  );
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  return model;
}

export async function trainOutcomeModel(
  samples: HistoricalOddsSample[],
  options: TrainOptions = {}
): Promise<TrainingArtifacts> {
  if (!samples.length) {
    throw new Error("No samples provided for training");
  }

  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const features = buildFeatureMatrix(samples);
  const labels = buildLabelVector(samples);
  const stats = computeStandardizationStats(features);
  const standardizedFeatures = standardizeMatrix(features, stats);

  const featureTensor = tf.tensor2d(standardizedFeatures);
  const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

  const model = buildModel(featureTensor.shape[1], resolved.learningRate);

  const history = await model.fit(featureTensor, labelTensor, {
    epochs: resolved.epochs,
    batchSize: resolved.batchSize,
    validationSplit: resolved.validationSplit,
    verbose: 0,
    callbacks: [
      tf.callbacks.earlyStopping({
        monitor: "val_loss",
        patience: 3,
        restoreBestWeights: true,
      }),
    ],
  });

  if (resolved.modelSavePath) {
    await ensureDirectoryForModel(resolved.modelSavePath);
    await model.save(resolved.modelSavePath);
    await saveStandardizationStats(resolved.modelSavePath, stats);
  }

  featureTensor.dispose();
  labelTensor.dispose();

  return { model, stats, history };
}

export async function evaluateModel(
  model: tf.LayersModel,
  samples: HistoricalOddsSample[],
  stats: StandardizationStats
): Promise<{ loss: number; accuracy: number }> {
  if (!samples.length) {
    return { loss: 0, accuracy: 0 };
  }
  const features = buildFeatureMatrix(samples);
  const labels = buildLabelVector(samples);
  const standardizedFeatures = standardizeMatrix(features, stats);
  const featureTensor = tf.tensor2d(standardizedFeatures);
  const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

  const evaluation = model.evaluate(featureTensor, labelTensor, {
    batchSize: 128,
    verbose: 0,
  });

  const evaluationArray = Array.isArray(evaluation) ? evaluation : [evaluation];
  const [lossTensor, accuracyTensor] = evaluationArray as tf.Tensor<tf.Rank>[];

  const lossData = await lossTensor.data();
  const accuracyData = await accuracyTensor.data();
  const loss = lossData[0];
  const accuracy = accuracyData[0];

  featureTensor.dispose();
  labelTensor.dispose();
  evaluationArray.forEach((tensor) => tensor.dispose());

  return { loss, accuracy };
}

async function ensureDirectoryForModel(modelSavePath: string): Promise<void> {
  if (!modelSavePath.startsWith("file://")) {
    return;
  }
  const url = new URL(modelSavePath);
  const path = url.pathname;
  await mkdir(dirname(path), { recursive: true });
}

async function saveStandardizationStats(
  modelSavePath: string,
  stats: StandardizationStats
): Promise<void> {
  if (!modelSavePath.startsWith("file://")) {
    return;
  }
  const url = new URL(modelSavePath);
  const statsPath = join(url.pathname, "stats.json");
  await writeFile(statsPath, JSON.stringify(stats, null, 2), "utf-8");
}
