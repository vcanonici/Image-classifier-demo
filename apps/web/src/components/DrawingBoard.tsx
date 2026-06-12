import { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_SIZE = 280;

interface DrawingBoardProps {
  onDrawingChange: (image: ImageData) => void;
}

export function DrawingBoard({ onDrawingChange }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousPoint = useRef<{ x: number; y: number } | null>(null);
  const [brushSize, setBrushSize] = useState(24);
  const [isErasing, setIsErasing] = useState(false);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) {
      return;
    }
    context.fillStyle = "black";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    onDrawingChange(context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
  }, [onDrawingChange]);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context || !previousPoint.current) {
      return;
    }
    const point = getCanvasPoint(event, canvas);
    context.strokeStyle = isErasing ? "black" : "white";
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(previousPoint.current.x, previousPoint.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    previousPoint.current = point;
    onDrawingChange(context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    previousPoint.current = getCanvasPoint(event, event.currentTarget);
    draw(event);
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    previousPoint.current = null;
  };

  return (
    <section className="drawing-panel" aria-labelledby="drawing-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Entrada</span>
          <h2 id="drawing-title">Desenhe um dígito</h2>
        </div>
        <button className="ghost-button" type="button" onClick={clearCanvas}>
          Limpar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        aria-label="Área para desenhar um dígito de zero a nove"
        onPointerDown={startDrawing}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            draw(event);
          }
        }}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
      />
      <div className="drawing-controls">
        <label>
          <span>Pincel</span>
          <input
            aria-label="Tamanho do pincel"
            type="range"
            min="10"
            max="42"
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />
        </label>
        <button
          className={isErasing ? "mode-button active" : "mode-button"}
          type="button"
          aria-pressed={isErasing}
          onClick={() => setIsErasing((current) => !current)}
        >
          {isErasing ? "Borracha ativa" : "Borracha"}
        </button>
      </div>
    </section>
  );
}

function getCanvasPoint(
  event: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
  };
}
