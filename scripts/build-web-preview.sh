#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export HOME="${HOME:-/tmp}"
export EXPO_HOME="${EXPO_HOME:-$ROOT_DIR/.tmp/expo-home}"
export CI=1

mkdir -p "$EXPO_HOME"

cd "$ROOT_DIR/apps/mobile"
npx expo export --platform web
