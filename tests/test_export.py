import json
from pathlib import Path
from typing import cast

from training.export import ExportMetrics, ModelArtifact, export_model, validate_artifact_checksum
from training.model import MnistNetwork


def test_exported_artifact_has_valid_checksum(tmp_path: Path) -> None:
    output_path = tmp_path / "model.json"
    artifact = export_model(MnistNetwork(), ExportMetrics(0.96, 0.95, 1), output_path)
    stored = cast(ModelArtifact, json.loads(output_path.read_text(encoding="utf-8")))

    assert stored == artifact
    assert stored["topology"] == [784, 16, 16, 10]
    assert validate_artifact_checksum(stored)


def test_checksum_detects_changes(tmp_path: Path) -> None:
    artifact = export_model(
        MnistNetwork(),
        ExportMetrics(0.96, 0.95, 1),
        tmp_path / "model.json",
    )
    artifact["metrics"]["testAccuracy"] = 0.1

    assert not validate_artifact_checksum(artifact)
