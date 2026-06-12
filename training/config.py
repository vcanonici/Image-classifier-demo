"""Shared paths and model configuration."""

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
CHECKPOINT_DIR = ROOT_DIR / "checkpoints"
MODEL_OUTPUT_PATH = ROOT_DIR / "models" / "mnist-784-16-16-10.json"
PARITY_FIXTURE_PATH = ROOT_DIR / "tests" / "fixtures" / "inference_case.json"

SCHEMA_VERSION = 1
MODEL_TOPOLOGY = (784, 16, 16, 10)
DEFAULT_SEED = 314159
