import { describe, expect, it } from "vitest";

import { canonicalJson, validateModel } from "./model";

describe("canonicalJson", () => {
  it("sorts object keys recursively", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}');
  });
});

describe("validateModel", () => {
  it("rejects an incompatible topology", () => {
    expect(() =>
      validateModel({
        schemaVersion: 1,
        topology: [784, 10],
        layers: [],
        checksum: `sha256:${"0".repeat(64)}`,
      }),
    ).toThrow("topologia");
  });
});
