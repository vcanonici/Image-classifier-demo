import type { DenseLayer, ModelArtifact } from "./model";

export interface InferenceResult {
  input: number[];
  hidden1: number[];
  hidden2: number[];
  logits: number[];
  probabilities: number[];
  prediction: number;
}

export function runInference(model: ModelArtifact, input: number[]): InferenceResult {
  if (input.length !== 784 || input.some((value) => !Number.isFinite(value))) {
    throw new Error("A inferência exige exatamente 784 pixels numéricos.");
  }
  const hidden1 = relu(dense(input, model.layers[0]));
  const hidden2 = relu(dense(hidden1, model.layers[1]));
  const logits = dense(hidden2, model.layers[2]);
  const probabilities = softmax(logits);
  return {
    input,
    hidden1,
    hidden2,
    logits,
    probabilities,
    prediction: indexOfMaximum(probabilities),
  };
}

export function softmax(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  const maximum = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - maximum));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
}

function dense(input: number[], layer: DenseLayer): number[] {
  return layer.weights.map(
    (row, outputIndex) =>
      row.reduce((sum, weight, inputIndex) => sum + weight * input[inputIndex], 0) +
      layer.biases[outputIndex],
  );
}

function relu(values: number[]): number[] {
  return values.map((value) => Math.max(0, value));
}

function indexOfMaximum(values: number[]): number {
  return values.reduce(
    (bestIndex, value, index) => (value > values[bestIndex] ? index : bestIndex),
    0,
  );
}
