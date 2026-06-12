import { useCallback, useEffect, useRef, useState } from "react";

import { DrawingBoard } from "./components/DrawingBoard";
import { NetworkDiagram } from "./components/NetworkDiagram";
import { PredictionPanel } from "./components/PredictionPanel";
import { isFrameDue } from "./frameBudget";
import { type InferenceResult, runInference } from "./inference";
import { type ModelArtifact, loadModel } from "./model";
import { preprocessDrawing } from "./preprocess";

export default function App() {
  const [model, setModel] = useState<ModelArtifact | null>(null);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingImage = useRef<ImageData | null>(null);
  const drawingVersion = useRef(0);
  const processedVersion = useRef(-1);

  useEffect(() => {
    loadModel()
      .then((loadedModel) => {
        setModel(loadedModel);
        setResult(runInference(loadedModel, new Array(784).fill(0)));
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Falha desconhecida.");
      });
  }, []);

  useEffect(() => {
    if (model === null) {
      return;
    }
    let animationFrame = 0;
    let lastFrame = 0;
    const update = (timestamp: number) => {
      const hasNewDrawing = processedVersion.current !== drawingVersion.current;
      if (
        hasNewDrawing &&
        pendingImage.current !== null &&
        isFrameDue(timestamp, lastFrame)
      ) {
        const input = preprocessDrawing(pendingImage.current);
        setResult(runInference(model, input));
        processedVersion.current = drawingVersion.current;
        lastFrame = timestamp;
      }
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [model]);

  const handleDrawingChange = useCallback((image: ImageData) => {
    pendingImage.current = image;
    drawingVersion.current += 1;
  }, []);

  if (error !== null) {
    return (
      <main className="status-screen">
        <span className="eyebrow">Erro ao iniciar</span>
        <h1>O checkpoint não pôde ser carregado.</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (model === null || result === null) {
    return (
      <main className="status-screen">
        <div className="loading-orbit" />
        <p>A carregar a rede neural…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">MNIST · rede neural no navegador</span>
          <h1>Veja a rede pensar.</h1>
          <p>
            Desenhe um número. Cada traço atravessa 784 pixels, duas camadas ocultas e dez
            hipóteses, tudo no seu dispositivo.
          </p>
        </div>
        <div className="model-stat">
          <span>Precisão no teste</span>
          <strong>{(model.metrics.testAccuracy * 100).toFixed(2)}%</strong>
          <small>{model.metrics.epochs} épocas · inferência local</small>
        </div>
      </header>

      <div className="interaction-grid">
        <div className="input-column">
          <DrawingBoard onDrawingChange={handleDrawingChange} />
          <PredictionPanel result={result} />
        </div>
        <NetworkDiagram model={model} result={result} />
      </div>

      <footer>
        <span>PyTorch no treino. TypeScript na inferência.</span>
        <a href="https://github.com/3b1b/videos/tree/master/_2017/nn">
          Arquitetura inspirada na explicação do 3Blue1Brown
        </a>
      </footer>
    </main>
  );
}
