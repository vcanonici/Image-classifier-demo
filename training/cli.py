"""Command line interface for data and model operations."""

from typing import Annotated

import typer

from training.data import download_mnist
from training.train import TrainingOptions, train_and_export

app = typer.Typer(no_args_is_help=True, help="Opera o pipeline Python da demo MNIST.")


@app.command("download-data")
def download_data_command() -> None:
    """Download MNIST into the ignored local data directory."""
    download_mnist()
    typer.echo("MNIST disponível em data/MNIST.")


@app.command()
def train(
    epochs: Annotated[int, typer.Option(min=1, help="Número de épocas.")] = 20,
    batch_size: Annotated[int, typer.Option(min=1, help="Tamanho do mini-batch.")] = 128,
    learning_rate: Annotated[
        float,
        typer.Option(min=0.000001, help="Taxa de aprendizagem do Adam."),
    ] = 0.001,
    minimum_accuracy: Annotated[
        float,
        typer.Option(min=0.0, max=1.0, help="Precisão mínima exigida no teste."),
    ] = 0.95,
    train_limit: Annotated[
        int | None,
        typer.Option(min=1, help="Limite opcional para smoke tests."),
    ] = None,
) -> None:
    """Train the network and export its public browser artifact."""
    options = TrainingOptions(
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate,
        minimum_accuracy=minimum_accuracy,
        train_limit=train_limit,
    )
    train_and_export(options)


if __name__ == "__main__":
    app()
