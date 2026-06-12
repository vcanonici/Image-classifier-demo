import { describe, expect, it } from "vitest";

import { runInference, softmax } from "./inference";
import type { ModelArtifact } from "./model";

describe("softmax", () => {
  it("is stable and sums to one", () => {
    const probabilities = softmax([1000, 1001, 1002]);
    expect(probabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    expect(probabilities[2]).toBeGreaterThan(probabilities[1]);
  });
});

describe("runInference", () => {
  it("propagates values through every layer", () => {
    const model = fixtureModel();
    const result = runInference(model, new Array(784).fill(1));
    expect(result.hidden1).toHaveLength(16);
    expect(result.hidden2).toHaveLength(16);
    expect(result.logits).toHaveLength(10);
    expect(result.probabilities).toHaveLength(10);
  });
});

function fixtureModel(): ModelArtifact {
  return {
    schemaVersion: 1,
    name: "fixture",
    topology: [784, 16, 16, 10],
    hiddenActivation: "relu",
    outputActivation: "softmax",
    preprocessing: {
      canvasSize: 280,
      targetBoxSize: 20,
      outputSize: 28,
      pixelRange: "0..1",
    },
    layers: [
      layer(16, 784, 0.001),
      layer(16, 16, 0.01),
      layer(10, 16, 0.01),
    ],
    metrics: { testAccuracy: 0.95, validationAccuracy: 0.95, epochs: 1 },
    checksum: `sha256:${"0".repeat(64)}`,
  };
}

function layer(outputs: number, inputs: number, weight: number) {
  return {
    weights: Array.from({ length: outputs }, () => new Array(inputs).fill(weight)),
    biases: new Array(outputs).fill(0),
  };
}
