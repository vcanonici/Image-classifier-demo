"""MNIST download and deterministic data loaders."""

from dataclasses import dataclass
from typing import cast

import torch
from torch import Tensor
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import datasets, transforms

from training.config import DATA_DIR


@dataclass(frozen=True)
class DataLoaders:
    """Training, validation and test loaders."""

    train: DataLoader[tuple[Tensor, Tensor]]
    validation: DataLoader[tuple[Tensor, Tensor]]
    test: DataLoader[tuple[Tensor, Tensor]]


def download_mnist() -> None:
    """Download both official MNIST splits if they are not cached."""
    transform = transforms.ToTensor()
    datasets.MNIST(DATA_DIR, train=True, download=True, transform=transform)
    datasets.MNIST(DATA_DIR, train=False, download=True, transform=transform)


def create_data_loaders(
    batch_size: int,
    seed: int,
    *,
    train_limit: int | None = None,
) -> DataLoaders:
    """Create deterministic loaders and reserve 5,000 training samples for validation."""
    if batch_size <= 0:
        raise ValueError("batch_size must be positive")

    transform = transforms.ToTensor()
    full_train = datasets.MNIST(DATA_DIR, train=True, download=True, transform=transform)
    test_dataset = datasets.MNIST(DATA_DIR, train=False, download=True, transform=transform)
    split_generator = torch.Generator().manual_seed(seed)
    train_dataset, validation_dataset = random_split(
        full_train,
        [55_000, 5_000],
        generator=split_generator,
    )

    if train_limit is not None:
        if train_limit <= 0:
            raise ValueError("train_limit must be positive")
        train_dataset = _take_subset(train_dataset, min(train_limit, len(train_dataset)))

    loader_generator = torch.Generator().manual_seed(seed)
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        generator=loader_generator,
        num_workers=0,
    )
    validation_loader = DataLoader(validation_dataset, batch_size=batch_size, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, num_workers=0)
    return DataLoaders(
        train=cast(DataLoader[tuple[Tensor, Tensor]], train_loader),
        validation=cast(DataLoader[tuple[Tensor, Tensor]], validation_loader),
        test=cast(DataLoader[tuple[Tensor, Tensor]], test_loader),
    )


def _take_subset(
    dataset: Dataset[tuple[torch.Tensor, int]],
    size: int,
) -> Dataset[tuple[torch.Tensor, int]]:
    indices = list(range(size))
    return torch.utils.data.Subset(dataset, indices)
