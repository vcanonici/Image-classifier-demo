"""Definition of the dense MNIST classifier."""

from collections.abc import Sequence

import torch
from torch import Tensor, nn

from training.config import MODEL_TOPOLOGY


class MnistNetwork(nn.Module):
    """Small MLP whose activations are exposed for browser visualization."""

    def __init__(self, topology: Sequence[int] = MODEL_TOPOLOGY) -> None:
        super().__init__()
        if tuple(topology) != MODEL_TOPOLOGY:
            raise ValueError(f"Expected topology {MODEL_TOPOLOGY}, received {tuple(topology)}")

        self.hidden1 = nn.Linear(topology[0], topology[1])
        self.hidden2 = nn.Linear(topology[1], topology[2])
        self.output = nn.Linear(topology[2], topology[3])

    def forward_with_activations(self, inputs: Tensor) -> tuple[Tensor, Tensor, Tensor]:
        """Return both hidden activations and output logits."""
        flattened = inputs.reshape(inputs.shape[0], -1)
        hidden1 = torch.relu(self.hidden1(flattened))
        hidden2 = torch.relu(self.hidden2(hidden1))
        logits = self.output(hidden2)
        return hidden1, hidden2, logits

    def forward(self, inputs: Tensor) -> Tensor:
        """Return class logits."""
        return self.forward_with_activations(inputs)[-1]
