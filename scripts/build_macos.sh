#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="${APP_NAME:-MFStat}"
HOST_ARCH="$(uname -m)"

if [[ -z "${MFSTAT_APP_VERSION:-}" ]]; then
  TAG_AT_HEAD="$(git -C "${ROOT_DIR}" tag --points-at HEAD | head -n 1 || true)"
  if [[ -n "${TAG_AT_HEAD}" ]]; then
    export MFSTAT_APP_VERSION="${TAG_AT_HEAD}"
  else
    SHORT_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    export MFSTAT_APP_VERSION="dev-${SHORT_SHA}"
  fi
fi
export VITE_APP_VERSION="${MFSTAT_APP_VERSION}"

if [[ "${HOST_ARCH}" != "arm64" && "${HOST_ARCH}" != "x86_64" ]]; then
  echo "Unsupported macOS architecture: ${HOST_ARCH}" >&2
  exit 1
fi

BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
PYTHON_BIN="${BACKEND_DIR}/.venv/bin/python"
PIP_BIN="${BACKEND_DIR}/.venv/bin/pip"
PYINSTALLER_BIN="${BACKEND_DIR}/.venv/bin/pyinstaller"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Python venv not found: ${PYTHON_BIN}" >&2
  echo "Run backend setup first." >&2
  exit 1
fi

if [[ ! -x "${PIP_BIN}" ]]; then
  echo "pip not found: ${PIP_BIN}" >&2
  exit 1
fi

if [[ ! -x "${PYINSTALLER_BIN}" ]]; then
  "${PIP_BIN}" install -r "${BACKEND_DIR}/requirements.txt" pyinstaller
fi

(
  cd "${FRONTEND_DIR}"
  echo "Building frontend with version: ${VITE_APP_VERSION}"
  npm run build
)

# Keep PyInstaller cache inside workspace to avoid host-path permission issues.
export PYINSTALLER_CONFIG_DIR="${BACKEND_DIR}/.pyinstaller"

(
  cd "${BACKEND_DIR}"
  "${PYINSTALLER_BIN}" \
    --clean \
    --noconfirm \
    --windowed \
    --name "${APP_NAME}" \
    --add-data "../frontend/dist:frontend/dist" \
    --collect-all webview \
    desktop_launcher.py
)

APP_BUNDLE="${BACKEND_DIR}/dist/${APP_NAME}.app"
ZIP_PATH="${BACKEND_DIR}/dist/${APP_NAME}-macos-${HOST_ARCH}.zip"

if [[ ! -d "${APP_BUNDLE}" ]]; then
  echo "Build succeeded but app bundle not found: ${APP_BUNDLE}" >&2
  exit 1
fi

rm -f "${ZIP_PATH}"
ditto -c -k --sequesterRsrc --keepParent "${APP_BUNDLE}" "${ZIP_PATH}"

echo "Built app bundle: ${APP_BUNDLE}"
echo "Built zip archive: ${ZIP_PATH}"
