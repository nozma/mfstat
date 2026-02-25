#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MFSTAT_APP_VERSION:-}" ]]; then
  LATEST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
  SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
  if [[ -n "${LATEST_TAG}" ]]; then
    export MFSTAT_APP_VERSION="${LATEST_TAG}+${SHORT_SHA}"
  else
    export MFSTAT_APP_VERSION="dev-${SHORT_SHA}"
  fi
fi

export VITE_APP_VERSION="${MFSTAT_APP_VERSION}"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

BACKEND_UVICORN="uvicorn"
if [[ -x "backend/.venv/bin/uvicorn" ]]; then
  BACKEND_UVICORN="./.venv/bin/uvicorn"
fi

(
  cd backend
  "${BACKEND_UVICORN}" app.main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

(
  cd frontend
  echo "Starting frontend with version: ${VITE_APP_VERSION}"
  npm run dev -- --host 0.0.0.0 --port 5173
) &
FRONTEND_PID=$!

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"
