import { describe, expect, it } from "vitest";

import { FRAME_INTERVAL_MS, MAX_INFERENCE_FPS, isFrameDue } from "./frameBudget";

describe("inference frame budget", () => {
  it("caps updates at 24 frames per second", () => {
    expect(MAX_INFERENCE_FPS).toBe(24);
    expect(isFrameDue(FRAME_INTERVAL_MS - 0.01, 0)).toBe(false);
    expect(isFrameDue(FRAME_INTERVAL_MS, 0)).toBe(true);
  });
});
