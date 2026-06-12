import torch

from training.model import MnistNetwork


def test_model_exposes_expected_shapes() -> None:
    model = MnistNetwork()
    hidden1, hidden2, logits = model.forward_with_activations(torch.zeros(2, 1, 28, 28))

    assert hidden1.shape == (2, 16)
    assert hidden2.shape == (2, 16)
    assert logits.shape == (2, 10)


def test_model_rejects_unexpected_topology() -> None:
    try:
        MnistNetwork((784, 32, 10))
    except ValueError as error:
        assert "Expected topology" in str(error)
    else:
        raise AssertionError("Expected invalid topology to fail")
