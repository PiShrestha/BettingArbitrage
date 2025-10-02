import * as tf from "@tensorflow/tfjs-node";

// Normalize the data between 0 and 1
function normalizeData(data: number[]): number[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  return data.map((x) => (x - min) / (max - min));
}

// Create sequences for LSTM model
function createSequences(
  data: number[],
  lookback: number
): [number[][], number[]] {
  const X = [];
  const y = [];

  for (let i = 0; i < data.length - lookback; i++) {
    X.push(data.slice(i, i + lookback));
    y.push(data[i + lookback]);
  }

  return [X, y];
}

// Build LSTM model for time series prediction
async function buildModel(sequenceLength: number): Promise<tf.LayersModel> {
  const model = tf.sequential();

  model.add(
    tf.layers.lstm({
      units: 50,
      inputShape: [sequenceLength, 1],
      returnSequences: false,
    })
  );

  model.add(tf.layers.dense({ units: 1 }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "meanSquaredError",
  });

  return model;
}

// Train model on historical odds data
export async function trainModel(
  historicalOdds: number[]
): Promise<tf.LayersModel> {
  const lookback = 10; // Use last 10 data points to predict next
  const normalizedData = normalizeData(historicalOdds);
  const [X, y] = createSequences(normalizedData, lookback);

  const xTensor = tf.tensor3d(X, [X.length, lookback, 1]);
  const yTensor = tf.tensor2d(y, [y.length, 1]);

  const model = await buildModel(lookback);

  await model.fit(xTensor, yTensor, {
    epochs: 100,
    batchSize: 32,
    shuffle: true,
    validationSplit: 0.1,
  });

  return model;
}

// Predict next odds movement
export async function predictNextOdds(
  model: tf.LayersModel,
  recentOdds: number[]
): Promise<number> {
  const lookback = recentOdds.length; // Ensure lookback matches the input length
  const normalizedInput = normalizeData(recentOdds);

  // Reshape normalizedInput to be a 2D array with shape [lookback, 1]
  const reshapedInput = normalizedInput.map((value) => [value]);

  // Create a 3D tensor with shape [1, lookback, 1]
  const inputTensor = tf.tensor3d([reshapedInput], [1, lookback, 1]);

  const prediction = (await model.predict(inputTensor)) as tf.Tensor;
  return prediction.dataSync()[0];
}
