export interface DenseLayer {
  weights: number[][];
  biases: number[];
}

export interface ModelMetrics {
  testAccuracy: number;
  validationAccuracy: number;
  epochs: number;
}

export interface ModelArtifact {
  schemaVersion: number;
  name: string;
  topology: number[];
  hiddenActivation: "relu";
  outputActivation: "softmax";
  preprocessing: {
    canvasSize: number;
    targetBoxSize: number;
    outputSize: number;
    pixelRange: string;
  };
  layers: DenseLayer[];
  metrics: ModelMetrics;
  checksum: string;
}

const EXPECTED_TOPOLOGY = [784, 16, 16, 10] as const;

export async function loadModel(): Promise<ModelArtifact> {
  const response = await fetch(`${import.meta.env.BASE_URL}model.json`);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o checkpoint (${response.status}).`);
  }
  const candidate: unknown = await response.json();
  const model = validateModel(candidate);
  await validateChecksum(model);
  return model;
}

export function validateModel(candidate: unknown): ModelArtifact {
  if (!isRecord(candidate)) {
    throw new Error("Checkpoint inválido: objeto esperado.");
  }
  if (candidate.schemaVersion !== 1) {
    throw new Error(`Checkpoint incompatível: schema ${String(candidate.schemaVersion)}.`);
  }
  if (
    !Array.isArray(candidate.topology) ||
    candidate.topology.length !== EXPECTED_TOPOLOGY.length ||
    candidate.topology.some((value, index) => value !== EXPECTED_TOPOLOGY[index])
  ) {
    throw new Error("Checkpoint incompatível: topologia 784-16-16-10 esperada.");
  }
  if (!Array.isArray(candidate.layers) || candidate.layers.length !== 3) {
    throw new Error("Checkpoint inválido: três camadas densas são obrigatórias.");
  }

  validateLayer(candidate.layers[0], 16, 784);
  validateLayer(candidate.layers[1], 16, 16);
  validateLayer(candidate.layers[2], 10, 16);

  if (
    typeof candidate.checksum !== "string" ||
    !candidate.checksum.startsWith("sha256:")
  ) {
    throw new Error("Checkpoint inválido: checksum ausente.");
  }
  return candidate as unknown as ModelArtifact;
}

export async function validateChecksum(model: ModelArtifact): Promise<void> {
  if (!globalThis.crypto?.subtle) {
    return;
  }
  const { checksum, ...payload } = model;
  const canonical = canonicalJson(normalizeChecksumNumbers(payload));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const actual = `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
  if (actual !== checksum) {
    throw new Error("Checkpoint corrompido: checksum não confere.");
  }
}

function normalizeChecksumNumbers(value: unknown): unknown {
  if (typeof value === "number") {
    return value.toFixed(8);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeChecksumNumbers);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeChecksumNumbers(entry)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateLayer(
  candidate: unknown,
  outputSize: number,
  inputSize: number,
): asserts candidate is DenseLayer {
  if (!isRecord(candidate) || !Array.isArray(candidate.weights) || !Array.isArray(candidate.biases)) {
    throw new Error("Checkpoint inválido: camada densa malformada.");
  }
  if (
    candidate.weights.length !== outputSize ||
    candidate.biases.length !== outputSize ||
    candidate.weights.some(
      (row) => !Array.isArray(row) || row.length !== inputSize || row.some((value) => !isNumber(value)),
    ) ||
    candidate.biases.some((value) => !isNumber(value))
  ) {
    throw new Error("Checkpoint inválido: dimensões ou valores da camada não conferem.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
