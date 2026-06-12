SHELL := /bin/bash
.DEFAULT_GOAL := help

ROOT := $(CURDIR)
NODE_VERSION := 24.16.0
NODE_DIR := $(ROOT)/.tools/node-v$(NODE_VERSION)-linux-x64
NODE_BIN := $(NODE_DIR)/bin
NPM := PATH="$(NODE_BIN):$$PATH" npm
NPX := PATH="$(NODE_BIN):$$PATH" npx
UV := uv

.PHONY: help setup setup-node setup-python setup-web setup-data setup-source dev start train test test-python test-web lint typecheck build clean

help:
	@printf '%s\n' \
	  'Comandos disponíveis:' \
	  '  make setup      Instala runtimes/dependências e baixa dados/referência' \
	  '  make start      Executa setup idempotente e abre a aplicação' \
	  '  make dev        Inicia o servidor Vite' \
	  '  make train      Treina, avalia e exporta o checkpoint público' \
	  '  make test       Executa testes Python e TypeScript' \
	  '  make lint       Executa Ruff e ESLint' \
	  '  make typecheck  Executa Pyright e TypeScript' \
	  '  make build      Gera a aplicação de produção'

setup: setup-node setup-python setup-web setup-data setup-source

setup-node:
	@./scripts/setup-node.sh "$(NODE_VERSION)"

setup-python:
	@$(UV) sync --frozen

setup-web: setup-node
	@cd apps/web && $(NPM) ci

setup-data: setup-python
	@$(UV) run mnist-demo download-data

setup-source:
	@./scripts/setup-source.sh

dev: setup-web
	@cd apps/web && $(NPM) run dev

start: setup
	@cd apps/web && $(NPM) run dev -- --open

train: setup-python
	@$(UV) run mnist-demo train

test: test-python test-web

test-python:
	@$(UV) run pytest

test-web: setup-web
	@cd apps/web && $(NPM) run test

lint: setup-web
	@$(UV) run ruff check training tests
	@cd apps/web && $(NPM) run lint

typecheck: setup-web
	@$(UV) run pyright training
	@cd apps/web && $(NPM) run typecheck

build: setup-web
	@cd apps/web && $(NPM) run build

clean:
	@rm -rf apps/web/dist apps/web/playwright-report apps/web/test-results
