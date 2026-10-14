import { describe, expect, it } from "vitest";

import { extractForegroundMask } from "./preprocess";

function makeImage(
  background: [number, number, number],
  ink?: [number, number, number],
): ImageData {
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    data.set([...background, 255], offset);
  }
  if (ink) {
    data.set([...ink, 255], (4 * width + 4) * 4);
  }
  return { width, height, data } as ImageData;
}

describe("extractForegroundMask para imagens importadas", () => {
  it("isola tinta escura em fundo amarelo, sem ativar o fundo", () => {
    const values = extractForegroundMask(makeImage([253, 230, 138], [91, 33, 182]));
    expect(values[0]).toBe(0);
    expect(values[4 * 8 + 4]).toBeGreaterThan(0.9);
  });

  it("isola tinta clara sobre fundo escuro", () => {
    const values = extractForegroundMask(makeImage([0, 0, 0], [255, 255, 255]));
    expect(values[0]).toBe(0);
    expect(values[4 * 8 + 4]).toBe(1);
  });

  it("mantem imagem uniforme sem tinta", () => {
    expect(extractForegroundMask(makeImage([190, 225, 242]))).toEqual(
      new Array(64).fill(0),
    );
  });

  it("rejeita dimensoes e dados inconsistentes", () => {
    expect(() => extractForegroundMask({
      width: 28, height: 28, data: new Uint8ClampedArray(4),
    } as ImageData)).toThrow("Imagem inválida");
  });
});
