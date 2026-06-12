import { useMemo } from "react";

import type { InferenceResult } from "../inference";
import type { ModelArtifact } from "../model";

interface NetworkDiagramProps {
  model: ModelArtifact;
  result: InferenceResult;
}

interface Point {
  x: number;
  y: number;
}

const VIEW_WIDTH = 920;
const VIEW_HEIGHT = 480;
const INPUT_X = 34;
const INPUT_Y = 72;
const PIXEL_SIZE = 8;
const PIXEL_GAP = 1;

export function NetworkDiagram({ model, result }: NetworkDiagramProps) {
  const hidden1Points = useMemo(() => layerPoints(410, 16), []);
  const hidden2Points = useMemo(() => layerPoints(650, 16), []);
  const outputPoints = useMemo(() => layerPoints(865, 10), []);
  const inputConnections = topInputConnections(model, result, hidden1Points, 64);

  return (
    <section className="network-panel" aria-labelledby="network-title">
      <div className="section-heading network-heading">
        <div>
          <span className="eyebrow">Ativações em tempo real</span>
          <h2 id="network-title">Visualização da rede</h2>
        </div>
        <span className="fps-badge">24 FPS máx.</span>
      </div>
      <div className="network-scroll">
        <svg
          className="network-svg"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          role="img"
          aria-label="Diagrama das ativações da rede neural"
        >
          <LayerLabel x={132} label="28 × 28 pixels" />
          <LayerLabel x={410} label="hidden 1" />
          <LayerLabel x={650} label="hidden 2" />
          <LayerLabel x={865} label="saída" />

          <g className="connections input-connections">
            {inputConnections.map(({ key, ...connection }) => (
              <ConnectionLine key={key} {...connection} />
            ))}
          </g>
          <g className="connections">
            {denseConnections(
              hidden1Points,
              hidden2Points,
              model.layers[1].weights,
              result.hidden1,
            )}
            {denseConnections(
              hidden2Points,
              outputPoints,
              model.layers[2].weights,
              result.hidden2,
            )}
          </g>

          <g className="input-grid">
            {result.input.map((activation, index) => {
              const x = INPUT_X + (index % 28) * (PIXEL_SIZE + PIXEL_GAP);
              const y = INPUT_Y + Math.floor(index / 28) * (PIXEL_SIZE + PIXEL_GAP);
              const lightness = 8 + activation * 82;
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={PIXEL_SIZE}
                  height={PIXEL_SIZE}
                  rx={1}
                  fill={`hsl(46 92% ${lightness}%)`}
                />
              );
            })}
          </g>
          <NodeLayer points={hidden1Points} activations={result.hidden1} color="primary" />
          <NodeLayer points={hidden2Points} activations={result.hidden2} color="secondary" />
          <NodeLayer
            points={outputPoints}
            activations={result.probabilities}
            color="highlight"
            labels
          />
        </svg>
      </div>
      <p className="diagram-note">
        Mostra as conexões mais relevantes entre entrada, camadas ocultas e saída.
      </p>
    </section>
  );
}

function NodeLayer({
  points,
  activations,
  color,
  labels = false,
}: {
  points: Point[];
  activations: number[];
  color: "primary" | "secondary" | "highlight";
  labels?: boolean;
}) {
  const maximum = Math.max(...activations, 0.0001);
  return (
    <g>
      {points.map((point, index) => {
        const normalized = Math.min(1, Math.max(0, activations[index] / maximum));
        return (
          <g key={index}>
            <circle
              className={`network-node ${color}`}
              cx={point.x}
              cy={point.y}
              r={9 + normalized * 5}
              style={{ opacity: 0.28 + normalized * 0.72 }}
            />
            {labels && (
              <text x={point.x + 22} y={point.y + 5} className="node-label">
                {index}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function LayerLabel({ x, label }: { x: number; label: string }) {
  return (
    <text x={x} y={34} textAnchor="middle" className="layer-label">
      {label}
    </text>
  );
}

function layerPoints(x: number, count: number): Point[] {
  const top = 65;
  const bottom = VIEW_HEIGHT - 36;
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, index) => ({ x, y: top + index * step }));
}

function denseConnections(
  sources: Point[],
  targets: Point[],
  weights: number[][],
  activations: number[],
) {
  const maxContribution = maximumContribution(weights, activations);
  return targets.flatMap((target, outputIndex) =>
    sources.map((source, inputIndex) => {
      const contribution = weights[outputIndex][inputIndex] * activations[inputIndex];
      return (
        <ConnectionLine
          key={`${source.x}-${inputIndex}-${target.x}-${outputIndex}`}
          source={source}
          target={target}
          contribution={contribution}
          maximum={maxContribution}
        />
      );
    }),
  );
}

function topInputConnections(
  model: ModelArtifact,
  result: InferenceResult,
  targets: Point[],
  limit: number,
) {
  return model.layers[0].weights
    .flatMap((row, outputIndex) =>
      row.map((weight, inputIndex) => {
        const pixelX = INPUT_X + (inputIndex % 28) * (PIXEL_SIZE + PIXEL_GAP) + PIXEL_SIZE / 2;
        const pixelY =
          INPUT_Y + Math.floor(inputIndex / 28) * (PIXEL_SIZE + PIXEL_GAP) + PIXEL_SIZE / 2;
        return {
          key: `${inputIndex}-${outputIndex}`,
          source: { x: pixelX, y: pixelY },
          target: targets[outputIndex],
          contribution: weight * result.input[inputIndex],
        };
      }),
    )
    .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
    .slice(0, limit)
    .map((connection, _, selected) => ({
      ...connection,
      maximum: Math.max(...selected.map((item) => Math.abs(item.contribution)), 0.0001),
    }));
}

function ConnectionLine({
  source,
  target,
  contribution,
  maximum,
}: {
  source: Point;
  target: Point;
  contribution: number;
  maximum: number;
  key?: string;
}) {
  const strength = Math.min(1, Math.abs(contribution) / maximum);
  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={contribution >= 0 ? "#008DBB" : "#7A929E"}
      strokeOpacity={0.045 + strength * 0.34}
      strokeWidth={0.35 + strength * 1.35}
    />
  );
}

function maximumContribution(weights: number[][], activations: number[]): number {
  return Math.max(
    ...weights.flatMap((row) =>
      row.map((weight, inputIndex) => Math.abs(weight * activations[inputIndex])),
    ),
    0.0001,
  );
}
