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
BACKEND_PORT="${MFSTAT_BACKEND_PORT:-8000}"
FRONTEND_PORT="${MFSTAT_FRONTEND_PORT:-5173}"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
}

stop_listeners_on_port() {
  local port="$1"
  local pids

  if ! command -v lsof >/dev/null 2>&1; then
    return
  fi

  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return
  fi

  echo "Stopping existing process on port ${port}: ${pids//$'\n'/ }"
  while IFS= read -r pid; do
    if [[ -n "${pid}" ]]; then
      kill "${pid}" 2>/dev/null || true
    fi
  done <<< "${pids}"
}

trap cleanup EXIT INT TERM

BACKEND_UVICORN="uvicorn"
if [[ -x "backend/.venv/bin/uvicorn" ]]; then
  BACKEND_UVICORN="./.venv/bin/uvicorn"
fi

stop_listeners_on_port "${BACKEND_PORT}"
stop_listeners_on_port "${FRONTEND_PORT}"

(
  cd backend
  "${BACKEND_UVICORN}" app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}"
) &
BACKEND_PID=$!

(
  cd frontend
  echo "Starting frontend with version: ${VITE_APP_VERSION}"
  npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT}"
) &
FRONTEND_PID=$!

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"
