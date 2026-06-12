import { describe, expect, it } from "vitest";

import parityFixture from "../../../tests/fixtures/inference_case.json";
import modelArtifact from "../../../models/mnist-784-16-16-10.json";
import { runInference } from "./inference";
import type { ModelArtifact } from "./model";

describe("PyTorch and TypeScript parity", () => {
  it("matches every exported activation", () => {
    const result = runInference(modelArtifact as ModelArtifact, parityFixture.input);

    expectVector(result.hidden1, parityFixture.hidden1);
    expectVector(result.hidden2, parityFixture.hidden2);
    expectVector(result.logits, parityFixture.logits);
    expectVector(result.probabilities, parityFixture.probabilities);
  });
});

function expectVector(actual: number[], expected: number[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => {
    expect(Math.abs(value - expected[index])).toBeLessThan(0.00001);
  });
}
