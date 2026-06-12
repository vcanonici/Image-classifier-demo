import pytest

from training.data import create_data_loaders


def test_data_loader_validates_batch_size() -> None:
    with pytest.raises(ValueError, match="batch_size"):
        create_data_loaders(0, 1)
