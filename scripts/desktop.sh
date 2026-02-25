#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="frontend"
BACKEND_DIR="backend"

BACKEND_PYTHON="python3"
if [[ -x "${BACKEND_DIR}/.venv/bin/python" ]]; then
  BACKEND_PYTHON=".venv/bin/python"
fi

(
  cd "${FRONTEND_DIR}"
  npm run build
)

(
  cd "${BACKEND_DIR}"
  "${BACKEND_PYTHON}" desktop_launcher.py
)
