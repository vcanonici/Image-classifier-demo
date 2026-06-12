# Rede Neural MNIST Interativa

Demo educativa de uma rede neural `784 → 16 → 16 → 10`. Desenhe um dígito com mouse,
caneta ou toque e acompanhe, em tempo real, os pixels, ativações ocultas, conexões e
probabilidades da classificação.

O modelo é treinado em Python com PyTorch. O checkpoint próprio é exportado para um contrato
JSON e a inferência roda integralmente em TypeScript no navegador. A aplicação publicada não
precisa de backend, Python ou GPU.

## Estrutura

- `apps/web/`: página React, inferência TypeScript, visualização e testes web.
- `training/`: modelo PyTorch, dataset, treino, avaliação e exportação.
- `models/`: checkpoint público e versionado.
- `tests/`: testes Python e fixture de paridade entre runtimes.
- `sources/`: referência externa ignorada pelo Git.

## Requisitos

O setup gerencia Node `24.16.0` localmente. É necessário ter:

- Linux x86-64;
- Python 3.12;
- [`uv`](https://docs.astral.sh/uv/);
- Make, Bash, Git e curl;
- acesso à internet no primeiro setup;
- GPU NVIDIA opcional. Sem CUDA, o treino usa CPU automaticamente.

## Começar

```bash
make setup
make start
```

`make setup` é idempotente e:

1. baixa e verifica o checksum oficial do Node;
2. cria `.venv` e instala o lock Python;
3. instala o lock npm;
4. baixa MNIST para `data/`;
5. faz sparse clone da referência histórica para `sources/3b1b-videos/`.

O checkpoint público já fica no Git, portanto `make dev` não exige novo treinamento.

## Comandos

```bash
make help       # lista os comandos
make setup      # prepara todo o ambiente
make dev        # inicia o Vite sem abrir o navegador
make start      # prepara e abre a aplicação
make train      # treina, avalia e exporta o modelo
make test       # testes Python e TypeScript
make lint       # Ruff e ESLint
make typecheck  # Pyright e TypeScript
make build      # build estático de produção
```

Teste end-to-end, após `make setup`:

```bash
cd apps/web
PATH="../../.tools/node-v24.16.0-linux-x64/bin:$PATH" npx playwright install chromium
PATH="../../.tools/node-v24.16.0-linux-x64/bin:$PATH" npm run test:e2e
```

## Modelo e artefato

A rede usa:

```text
Flatten(28 × 28)
Linear(784, 16) + ReLU
Linear(16, 16) + ReLU
Linear(16, 10)
Softmax apenas para exibição
```

O treino usa Adam e cross-entropy, split determinístico de 55.000/5.000 imagens e exige pelo
menos 95% de precisão no conjunto oficial de teste. O JSON público contém topologia,
pré-processamento, pesos, biases, métricas, versão de schema e checksum SHA-256.

Dados e checkpoints PyTorch intermediários são ignorados. Apenas o artefato necessário para
inferência no navegador é versionado.

## Interface

- máximo de 24 inferências por segundo via `requestAnimationFrame`;
- pré-processamento semelhante ao MNIST: recorte, caixa de 20 pixels e centralização por massa;
- layout automático para desktop, telemóvel em retrato e telemóvel em paisagem;
- suporte unificado a mouse, caneta e toque com Pointer Events;
- todas as conexões entre camadas pequenas e as 64 maiores contribuições da entrada.

## Publicação

Os workflows em `.github/workflows/` validam o projeto e publicam o build no GitHub Pages.
Depois de criar um repositório público e adicionar o remote:

```bash
git remote add origin <URL_DO_REPOSITORIO>
git push -u origin main
```

No GitHub, selecione **Settings → Pages → Source → GitHub Actions**.

## Referência e licenças

A topologia segue a explicação de redes neurais do
[`3b1b/videos`](https://github.com/3b1b/videos/tree/master/_2017/nn). `make setup-source`
baixa apenas essa referência, no commit `e317d6c`, para uma pasta ignorada. O conteúdo de
origem usa CC BY-NC-SA 4.0 e não é incorporado nem redistribuído por este projeto.

O código e o checkpoint próprio deste repositório são disponibilizados sob a licença MIT.
MNIST mantém os termos indicados por sua fonte.
