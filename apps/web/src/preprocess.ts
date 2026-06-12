const OUTPUT_SIZE = 28;
const TARGET_BOX_SIZE = 20;
const ACTIVE_THRESHOLD = 8;

export function preprocessDrawing(image: ImageData): number[] {
  const source = extractGrayscale(image);
  const bounds = findBounds(source, image.width, image.height);
  if (bounds === null) {
    return new Array(OUTPUT_SIZE * OUTPUT_SIZE).fill(0);
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  sourceCanvas.getContext("2d", { willReadFrequently: true })?.putImageData(image, 0, 0);

  const boxWidth = bounds.maxX - bounds.minX + 1;
  const boxHeight = bounds.maxY - bounds.minY + 1;
  const scale = TARGET_BOX_SIZE / Math.max(boxWidth, boxHeight);
  const resizedWidth = Math.max(1, Math.round(boxWidth * scale));
  const resizedHeight = Math.max(1, Math.round(boxHeight * scale));

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = OUTPUT_SIZE;
  targetCanvas.height = OUTPUT_SIZE;
  const context = targetCanvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("Canvas 2D indisponível para pré-processar o desenho.");
  }
  context.fillStyle = "black";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    sourceCanvas,
    bounds.minX,
    bounds.minY,
    boxWidth,
    boxHeight,
    Math.floor((OUTPUT_SIZE - resizedWidth) / 2),
    Math.floor((OUTPUT_SIZE - resizedHeight) / 2),
    resizedWidth,
    resizedHeight,
  );

  const centered = centerByMass(
    context.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE),
    targetCanvas,
  );
  return extractGrayscale(centered);
}

export function extractGrayscale(image: ImageData): number[] {
  const values = new Array<number>(image.width * image.height);
  for (let pixel = 0; pixel < values.length; pixel += 1) {
    const offset = pixel * 4;
    values[pixel] =
      (image.data[offset] + image.data[offset + 1] + image.data[offset + 2]) / (3 * 255);
  }
  return values;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function findBounds(values: number[], width: number, height: number): Bounds | null {
  const bounds: Bounds = { minX: width, minY: height, maxX: -1, maxY: -1 };
  values.forEach((value, index) => {
    if (value * 255 < ACTIVE_THRESHOLD) {
      return;
    }
    const x = index % width;
    const y = Math.floor(index / width);
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  });
  return bounds.maxX < 0 ? null : bounds;
}

function centerByMass(image: ImageData, canvas: HTMLCanvasElement): ImageData {
  const values = extractGrayscale(image);
  let mass = 0;
  let weightedX = 0;
  let weightedY = 0;
  values.forEach((value, index) => {
    mass += value;
    weightedX += (index % OUTPUT_SIZE) * value;
    weightedY += Math.floor(index / OUTPUT_SIZE) * value;
  });
  if (mass === 0) {
    return image;
  }

  const center = (OUTPUT_SIZE - 1) / 2;
  const shiftX = Math.round(center - weightedX / mass);
  const shiftY = Math.round(center - weightedY / mass);
  if (shiftX === 0 && shiftY === 0) {
    return image;
  }

  const shiftedCanvas = document.createElement("canvas");
  shiftedCanvas.width = OUTPUT_SIZE;
  shiftedCanvas.height = OUTPUT_SIZE;
  const context = shiftedCanvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    return image;
  }
  context.fillStyle = "black";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(canvas, shiftX, shiftY);
  return context.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
}
