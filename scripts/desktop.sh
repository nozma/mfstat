#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="frontend"
BACKEND_DIR="backend"

if [[ -z "${MFSTAT_APP_VERSION:-}" ]]; then
  TAG_AT_HEAD="$(git tag --points-at HEAD | head -n 1 || true)"
  if [[ -n "${TAG_AT_HEAD}" ]]; then
    export MFSTAT_APP_VERSION="${TAG_AT_HEAD}"
  else
    SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    export MFSTAT_APP_VERSION="dev-${SHORT_SHA}"
  fi
fi
export VITE_APP_VERSION="${MFSTAT_APP_VERSION}"

BACKEND_PYTHON="python3"
if [[ -x "${BACKEND_DIR}/.venv/bin/python" ]]; then
  BACKEND_PYTHON=".venv/bin/python"
fi

(
  cd "${FRONTEND_DIR}"
  echo "Building frontend with version: ${VITE_APP_VERSION}"
  npm run build
)

(
  cd "${BACKEND_DIR}"
  "${BACKEND_PYTHON}" desktop_launcher.py
)
