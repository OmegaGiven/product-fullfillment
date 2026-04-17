#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-web}"

export HOME="${HOME:-/tmp}"
export EXPO_HOME="${EXPO_HOME:-$ROOT_DIR/.tmp/expo-home}"

mkdir -p "$EXPO_HOME"

cd "$ROOT_DIR"

if [ ! -d node_modules ]; then
  echo "Installing workspace dependencies..."
  npm install
fi

case "$MODE" in
  web)
    echo "Starting Expo web preview..."
    npm run mobile:web
    ;;
  ios)
    echo "Starting Expo iOS preview..."
    npm run mobile:ios
    ;;
  android)
    echo "Starting Expo Android preview..."
    npm run mobile:android
    ;;
  native)
    echo "Starting Expo dev server..."
    npm run mobile:start
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: npm run dev -- [web|ios|android|native]"
    exit 1
    ;;
esac
