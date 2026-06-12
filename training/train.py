"""Deterministic training loop and checkpoint orchestration."""

import os
import random
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from torch import Tensor, nn
from torch.optim import Adam
from torch.utils.data import DataLoader

from training.config import (
    CHECKPOINT_DIR,
    DEFAULT_SEED,
    MODEL_OUTPUT_PATH,
    PARITY_FIXTURE_PATH,
)
from training.data import create_data_loaders
from training.export import ExportMetrics, export_model, export_parity_fixture, metrics_to_dict
from training.model import MnistNetwork


@dataclass(frozen=True)
class TrainingOptions:
    """Inputs controlling a reproducible training run."""

    epochs: int = 20
    batch_size: int = 128
    learning_rate: float = 0.001
    seed: int = DEFAULT_SEED
    minimum_accuracy: float = 0.95
    train_limit: int | None = None


@dataclass(frozen=True)
class TrainingResult:
    """Summary of a completed training run."""

    device: str
    validation_accuracy: float
    test_accuracy: float
    output_path: Path


def train_and_export(options: TrainingOptions) -> TrainingResult:
    """Train, evaluate, checkpoint and export a browser-compatible model."""
    _validate_options(options)
    _set_determinism(options.seed)
    device = _select_device()
    loaders = create_data_loaders(options.batch_size, options.seed, train_limit=options.train_limit)
    model = MnistNetwork().to(device)
    optimizer = Adam(model.parameters(), lr=options.learning_rate)
    loss_function = nn.CrossEntropyLoss()
    best_validation = 0.0
    best_state: dict[str, Tensor] | None = None
    started_at = time.monotonic()

    for epoch in range(1, options.epochs + 1):
        average_loss = _train_epoch(model, loaders.train, optimizer, loss_function, device)
        validation_accuracy = evaluate(model, loaders.validation, device)
        if validation_accuracy > best_validation:
            best_validation = validation_accuracy
            best_state = {
                name: value.detach().cpu().clone()
                for name, value in model.state_dict().items()
            }
        print(
            f"epoch={epoch}/{options.epochs} loss={average_loss:.4f} "
            f"validation_accuracy={validation_accuracy:.4%}"
        )

    if best_state is None:
        raise RuntimeError("Training completed without producing a checkpoint")

    model.load_state_dict(best_state)
    model.to(device)
    test_accuracy = evaluate(model, loaders.test, device)
    if test_accuracy < options.minimum_accuracy:
        raise RuntimeError(
            f"Test accuracy {test_accuracy:.4%} is below required {options.minimum_accuracy:.2%}"
        )

    metrics = ExportMetrics(test_accuracy, best_validation, options.epochs)
    _save_checkpoint(model, options, metrics)
    export_model(model.cpu(), metrics, MODEL_OUTPUT_PATH)
    export_parity_fixture(model.cpu(), PARITY_FIXTURE_PATH)
    duration = time.monotonic() - started_at
    print(
        f"training_complete device={device.type} test_accuracy={test_accuracy:.4%} "
        f"duration_seconds={duration:.1f} artifact={MODEL_OUTPUT_PATH}"
    )
    return TrainingResult(device.type, best_validation, test_accuracy, MODEL_OUTPUT_PATH)


def evaluate(
    model: MnistNetwork,
    loader: DataLoader[tuple[Tensor, Tensor]],
    device: torch.device,
) -> float:
    """Calculate classification accuracy for one data loader."""
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for inputs, labels in loader:
            logits = model(inputs.to(device))
            predictions = logits.argmax(dim=1)
            labels = labels.to(device)
            correct += int((predictions == labels).sum().item())
            total += labels.numel()
    return correct / total


def _train_epoch(
    model: MnistNetwork,
    loader: DataLoader[tuple[Tensor, Tensor]],
    optimizer: Adam,
    loss_function: nn.CrossEntropyLoss,
    device: torch.device,
) -> float:
    model.train()
    total_loss = 0.0
    sample_count = 0
    for inputs, labels in loader:
        inputs = inputs.to(device)
        labels = labels.to(device)
        optimizer.zero_grad(set_to_none=True)
        loss = loss_function(model(inputs), labels)
        loss.backward()
        optimizer.step()
        batch_size = labels.shape[0]
        total_loss += float(loss.item()) * batch_size
        sample_count += batch_size
    return total_loss / sample_count


def _save_checkpoint(
    model: MnistNetwork,
    options: TrainingOptions,
    metrics: ExportMetrics,
) -> None:
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "modelState": model.state_dict(),
            "options": options.__dict__,
            "metrics": metrics_to_dict(metrics),
        },
        CHECKPOINT_DIR / "best.pt",
    )


def _select_device() -> torch.device:
    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0)
        print(f"device=cuda name={name}")
        return torch.device("cuda")
    print("device=cpu reason=cuda_unavailable")
    return torch.device("cpu")


def _set_determinism(seed: int) -> None:
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(True)


def _validate_options(options: TrainingOptions) -> None:
    if options.epochs <= 0:
        raise ValueError("epochs must be positive")
    if options.learning_rate <= 0:
        raise ValueError("learning_rate must be positive")
    if not 0 < options.minimum_accuracy <= 1:
        raise ValueError("minimum_accuracy must be in the interval (0, 1]")
