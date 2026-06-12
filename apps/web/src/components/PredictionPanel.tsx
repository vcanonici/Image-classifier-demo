import type { InferenceResult } from "../inference";

interface PredictionPanelProps {
  result: InferenceResult;
}

export function PredictionPanel({ result }: PredictionPanelProps) {
  const confidence = result.probabilities[result.prediction] ?? 0;
  return (
    <section className="prediction-panel" aria-live="polite">
      <div className="prediction-main">
        <span className="eyebrow">Previsão</span>
        <strong>{result.prediction}</strong>
        <span>{(confidence * 100).toFixed(1)}% de confiança</span>
      </div>
      <div className="probability-list" aria-label="Probabilidades por dígito">
        {result.probabilities.map((probability, digit) => (
          <div className="probability-row" key={digit}>
            <span>{digit}</span>
            <div className="probability-track">
              <div
                className={digit === result.prediction ? "probability-fill winner" : "probability-fill"}
                style={{ width: `${Math.max(1, probability * 100)}%` }}
              />
            </div>
            <output>{(probability * 100).toFixed(1)}%</output>
          </div>
        ))}
      </div>
    </section>
  );
}
