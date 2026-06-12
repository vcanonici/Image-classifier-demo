export const MAX_INFERENCE_FPS = 24;
export const FRAME_INTERVAL_MS = 1000 / MAX_INFERENCE_FPS;

export function isFrameDue(timestamp: number, lastFrame: number): boolean {
  return timestamp - lastFrame >= FRAME_INTERVAL_MS;
}
