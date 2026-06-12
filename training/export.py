"""Export the PyTorch model into a validated browser artifact."""

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import TypedDict

import torch
from torch import Tensor

from training.config import MODEL_TOPOLOGY, PARITY_FIXTURE_PATH, SCHEMA_VERSION
from training.model import MnistNetwork


class DenseLayerArtifact(TypedDict):
    """Serialized weights and biases for one dense layer."""

    weights: list[list[float]]
    biases: list[float]


class MetricsArtifact(TypedDict):
    """Model quality recorded during export."""

    testAccuracy: float
    validationAccuracy: float
    epochs: int


class ModelArtifact(TypedDict):
    """Public model contract consumed by the TypeScript application."""

    schemaVersion: int
    name: str
    topology: list[int]
    hiddenActivation: str
    outputActivation: str
    preprocessing: dict[str, int | str]
    layers: list[DenseLayerArtifact]
    metrics: MetricsArtifact
    checksum: str


@dataclass(frozen=True)
class ExportMetrics:
    """Metrics attached to a public artifact."""

    test_accuracy: float
    validation_accuracy: float
    epochs: int


def export_model(model: MnistNetwork, metrics: ExportMetrics, output_path: Path) -> ModelArtifact:
    """Write a compact, checksummed artifact and return its payload."""
    layers = [
        _serialize_layer(model.hidden1.weight, model.hidden1.bias),
        _serialize_layer(model.hidden2.weight, model.hidden2.bias),
        _serialize_layer(model.output.weight, model.output.bias),
    ]
    payload_without_checksum = {
        "schemaVersion": SCHEMA_VERSION,
        "name": "mnist-784-16-16-10",
        "topology": list(MODEL_TOPOLOGY),
        "hiddenActivation": "relu",
        "outputActivation": "softmax",
        "preprocessing": {
            "canvasSize": 280,
            "targetBoxSize": 20,
            "outputSize": 28,
            "pixelRange": "0..1",
        },
        "layers": layers,
        "metrics": {
            "testAccuracy": round(metrics.test_accuracy, 6),
            "validationAccuracy": round(metrics.validation_accuracy, 6),
            "epochs": metrics.epochs,
        },
    }
    checksum = _checksum(payload_without_checksum)
    artifact: ModelArtifact = {**payload_without_checksum, "checksum": checksum}  # type: ignore[typeddict-item]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(_canonical_json(artifact) + "\n", encoding="utf-8")
    return artifact


def export_parity_fixture(model: MnistNetwork, output_path: Path = PARITY_FIXTURE_PATH) -> None:
    """Export a deterministic inference case shared by Python and TypeScript tests."""
    input_values = torch.linspace(0.0, 1.0, MODEL_TOPOLOGY[0], dtype=torch.float32)
    with torch.no_grad():
        hidden1, hidden2, logits = model.forward_with_activations(input_values.unsqueeze(0))
        probabilities = torch.softmax(logits, dim=1)

    fixture = {
        "input": _round_tensor(input_values),
        "hidden1": _round_tensor(hidden1.squeeze(0)),
        "hidden2": _round_tensor(hidden2.squeeze(0)),
        "logits": _round_tensor(logits.squeeze(0)),
        "probabilities": _round_tensor(probabilities.squeeze(0)),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(_canonical_json(fixture) + "\n", encoding="utf-8")


def validate_artifact_checksum(artifact: ModelArtifact) -> bool:
    """Return whether an artifact checksum matches its canonical contents."""
    payload = dict(artifact)
    checksum = payload.pop("checksum")
    return checksum == _checksum(payload)


def metrics_to_dict(metrics: ExportMetrics) -> dict[str, float | int]:
    """Expose metrics using Python naming for checkpoint metadata."""
    return asdict(metrics)


def _serialize_layer(weight: Tensor, bias: Tensor) -> DenseLayerArtifact:
    return {
        "weights": [[round(float(value), 8) for value in row] for row in weight.tolist()],
        "biases": [round(float(value), 8) for value in bias.tolist()],
    }


def _round_tensor(tensor: Tensor) -> list[float]:
    return [round(float(value), 7) for value in tensor.tolist()]


def _canonical_json(payload: object) -> str:
    return json.dumps(payload, ensure_ascii=True, separators=(",", ":"), sort_keys=True)


def _checksum(payload: object) -> str:
    serialized = _canonical_json(_normalize_checksum_numbers(payload)).encode("utf-8")
    return f"sha256:{hashlib.sha256(serialized).hexdigest()}"


def _normalize_checksum_numbers(payload: object) -> object:
    if isinstance(payload, bool) or payload is None or isinstance(payload, str):
        return payload
    if isinstance(payload, int | float):
        return f"{float(payload):.8f}"
    if isinstance(payload, list):
        return [_normalize_checksum_numbers(value) for value in payload]
    if isinstance(payload, dict):
        return {key: _normalize_checksum_numbers(value) for key, value in payload.items()}
    raise TypeError(f"Unsupported checksum value: {type(payload).__name__}")
