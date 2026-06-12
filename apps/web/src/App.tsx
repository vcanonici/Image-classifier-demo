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
  const [logoFailed, setLogoFailed] = useState(false);
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
      <div className="brand-bar">
        <div className="brand-lockup">
          {!logoFailed ? (
            <img
              className="piep-logo"
              src={`${import.meta.env.BASE_URL}piep-logo.png`}
              alt="PIEP - Pólo de Inovação em Engenharia de Polímeros"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="piep-logo-fallback">
              <strong>PIEP</strong>
              <span>Pólo de Inovação em Engenharia de Polímeros</span>
            </div>
          )}
        </div>
        <div className="brand-context">
          <span>IA aplicada</span>
          <span>Digitalização</span>
          <span>Engenharia</span>
        </div>
      </div>

      <header className="hero">
        <div className="hero-content">
          <span className="eyebrow">Demonstração de IA aplicada · PIEP</span>
          <h1>Rede neural MNIST em tempo real</h1>
          <p>
            Desenhe um dígito e acompanhe como uma rede neural transforma pixels em
            ativações, camadas intermédias e probabilidades de classificação, diretamente
            no navegador.
          </p>
        </div>
        <div className="institutional-stat">
          <span>Precisão no teste</span>
          <strong>{(model.metrics.testAccuracy * 100).toFixed(2)}%</strong>
          <small>inferência local · sem backend</small>
        </div>
      </header>

      <div className="interaction-grid">
        <div className="input-column">
          <DrawingBoard onDrawingChange={handleDrawingChange} />
          <PredictionPanel result={result} />
        </div>
        <NetworkDiagram model={model} result={result} />
      </div>

      <footer className="institutional-footer">
        <div>
          <strong>Demonstração educativa de IA aplicada · PIEP</strong>
          <a href="https://github.com/3b1b/videos/tree/master/_2017/nn">
            Referência pedagógica: 3Blue1Brown
          </a>
        </div>
        <span>Treino em PyTorch · inferência em TypeScript no navegador</span>
      </footer>
    </main>
  );
}
