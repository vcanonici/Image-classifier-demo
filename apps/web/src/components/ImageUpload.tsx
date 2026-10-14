import { useEffect, useRef, useState } from "react";

import { type InferenceResult, runInference } from "../inference";
import type { ModelArtifact } from "../model";
import { preprocessUploadedImage } from "../preprocess";

const MAX_FILES = 20;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

interface ClassifiedImage {
  name: string;
  previewUrl: string;
  result: InferenceResult;
}

interface ImageUploadProps {
  model: ModelArtifact;
  onInspect: (result: InferenceResult, fileName: string) => void;
}

async function classifyFile(file: File, model: ModelArtifact): Promise<ClassifiedImage> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Formato não suportado. Use PNG, JPEG ou WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("A imagem excede o limite de 8 MB.");
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = previewUrl;
    await image.decode();

    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth > MAX_DIMENSION ||
      image.naturalHeight > MAX_DIMENSION ||
      image.naturalWidth * image.naturalHeight > MAX_DIMENSION * MAX_DIMENSION
    ) {
      throw new Error("Dimensões inválidas. O máximo é 4096 × 4096 pixels.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      throw new Error("Canvas 2D indisponível.");
    }
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const input = preprocessUploadedImage(pixels);
    return { name: file.name, previewUrl, result: runInference(model, input) };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

export function ImageUpload({ model, onInspect }: ImageUploadProps) {
  const [items, setItems] = useState<ClassifiedImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  useEffect(() => () => {
    for (const item of items) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }, [items]);

  async function handleFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }
    const currentRequest = ++requestId.current;
    setProcessing(true);
    setMessage(null);
    const output: ClassifiedImage[] = [];
    const failures: string[] = [];
    if (files.length > MAX_FILES) {
      failures.push("Foram selecionados " + files.length + " ficheiros; limite: " + MAX_FILES + ".");
    }

    for (const file of files.slice(0, MAX_FILES)) {
      try {
        output.push(await classifyFile(file, model));
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Erro desconhecido.";
        failures.push(file.name + ": " + reason);
      }
    }

    if (requestId.current !== currentRequest) {
      output.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      return;
    }

    setItems(output);
    setSelectedIndex(output.length > 0 ? 0 : null);
    setProcessing(false);
    setMessage(failures.length > 0 ? failures.join(" ") : null);
    if (output[0]) {
      onInspect(output[0].result, output[0].name);
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Importação local</span>
          <h2 id="upload-title">Carregar imagens</h2>
        </div>
      </div>
      <p className="upload-description">
        Selecione imagens PNG, JPEG ou WebP (até {MAX_FILES}). A rede analisa os
        píxeis no navegador, sem enviar as imagens a um servidor.
      </p>
      <label className="upload-select">
        <span>Selecionar imagens</span>
        <input
          aria-label="Carregar imagens de dígitos"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={processing}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            void handleFiles(files);
          }}
        />
      </label>
      {processing && <p className="upload-status" role="status">A analisar imagens…</p>}
      {message && <p className="upload-error" role="alert">{message}</p>}
      {items.length > 0 && (
        <>
          <p className="upload-status" role="status">
            {items.length} imagem(ns) classificadas. Selecione um resultado para ver
            as ativações da rede.
          </p>
          <div className="upload-results" aria-label="Resultados das imagens carregadas">
            {items.map((item, index) => (
              <button
                type="button"
                key={index}
                className={index === selectedIndex ? "upload-result selected" : "upload-result"}
                aria-pressed={index === selectedIndex}
                onClick={() => {
                  setSelectedIndex(index);
                  onInspect(item.result, item.name);
                }}
              >
                <img src={item.previewUrl} alt={"Pré-visualização de " + item.name} />
                <span className="upload-filename" title={item.name}>{item.name}</span>
                <span className="upload-prediction">
                  <strong>{item.result.prediction}</strong>
                  <small>{(item.result.probabilities[item.result.prediction] * 100).toFixed(1)}%</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
