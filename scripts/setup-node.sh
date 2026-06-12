#!/usr/bin/env bash
set -euo pipefail

version="${1:-24.16.0}"
platform="linux-x64"
archive="node-v${version}-${platform}.tar.xz"
tools_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.tools"
install_dir="${tools_dir}/node-v${version}-${platform}"
download_dir="${tools_dir}/downloads"
base_url="https://nodejs.org/dist/v${version}"

if [[ -x "${install_dir}/bin/node" ]]; then
  echo "Node $version já está disponível em ${install_dir}."
  exit 0
fi

mkdir -p "$download_dir"
curl --fail --location --retry 3 --output "${download_dir}/${archive}" "${base_url}/${archive}"
curl --fail --location --retry 3 --output "${download_dir}/SHASUMS256.txt" "${base_url}/SHASUMS256.txt"

expected_line="$(grep "  ${archive}$" "${download_dir}/SHASUMS256.txt")"
if [[ -z "$expected_line" ]]; then
  echo "Checksum oficial não encontrado para ${archive}." >&2
  exit 1
fi

(
  cd "$download_dir"
  printf '%s\n' "$expected_line" | sha256sum --check -
)

tar --extract --xz --file "${download_dir}/${archive}" --directory "$tools_dir"
"${install_dir}/bin/node" --version
