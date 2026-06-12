import { describe, expect, it } from "vitest";

import { extractGrayscale } from "./preprocess";

describe("extractGrayscale", () => {
  it("normalizes RGB pixels into the expected range", () => {
    const image = {
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255,
        255, 0, 0, 255,
      ]),
      width: 3,
      height: 1,
    } as ImageData;

    expect(extractGrayscale(image)).toEqual([0, 1, 1 / 3]);
  });
});
