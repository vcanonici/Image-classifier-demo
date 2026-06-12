#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
destination="${root}/sources/3b1b-videos"
revision="e317d6c5eaa8370a2deb4d148c246b0d0e9fbe6f"

if [[ -d "${destination}/.git" ]]; then
  current_revision="$(git -C "$destination" rev-parse HEAD)"
  if [[ "$current_revision" == "$revision" ]]; then
    echo "Referência 3Blue1Brown já está no commit fixado."
    exit 0
  fi
  echo "A referência existente não está no commit esperado: ${current_revision}" >&2
  exit 1
fi

mkdir -p "$(dirname "$destination")"
git clone --filter=blob:none --no-checkout https://github.com/3b1b/videos.git "$destination"
git -C "$destination" sparse-checkout init --cone
git -C "$destination" sparse-checkout set _2017/nn LICENSE.txt
git -C "$destination" checkout "$revision"
