# MFStat

マリオテニスフィーバーのランクマッチ結果を記録する個人向けローカルWebアプリです。

## Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: FastAPI + SQLModel
- DB: SQLite
- Migration: Alembic

## Setup

### 1. Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend
```bash
cd frontend
npm install
```

## Development Run
```bash
make dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Desktop Run (専用ウィンドウ)
```bash
make desktop
```

- `frontend` をビルドし、`pywebview` の専用ウィンドウでアプリを起動します。
- APIサーバーはローカルで `http://127.0.0.1:8000`（使用中なら空きポート）に起動します。

## DB Storage Location
- 現在のDB保存先はユーザーごとのアプリデータディレクトリです。
- macOS: `~/Library/Application Support/mfstat/mfstat.db`
- Windows: `%APPDATA%/mfstat/mfstat.db`
- Linux: `$XDG_DATA_HOME/mfstat/mfstat.db` (未設定時は `~/.local/share/mfstat/mfstat.db`)

### Legacy DB migration
- 旧保存先 `backend/mfstat.db` が存在し、新保存先にDBがまだない場合は、起動時に自動移行します。
- 移行前に新保存先配下へバックアップを作成します:
  - `.../mfstat/backups/mfstat.db.legacy-backup-YYYYMMDD-HHMMSS`

## Build for Distribution
OSごとにそのOS上でビルドしてください（クロスビルドは想定しません）。

### macOS (Apple Silicon / Intel)
```bash
make build-macos
```

- 出力: `backend/dist/MFStat.app`
- 配布用zip: `backend/dist/MFStat-macos-<arch>.zip`
- `<arch>` は `arm64` または `x86_64` です。

### Windows (x64)
PowerShellで実行:

```powershell
.\scripts\build_windows.ps1
```

- 出力: `backend/dist/MFStat`（one-folder）
- 配布用zip: `backend/dist/MFStat-windows-x64.zip`

### Notes
- Intel Mac向けはIntel Mac上で `make build-macos` を実行してください。
- Windows向けはWindows環境上で `build_windows.ps1` を実行してください。
- 配布前に各OSで起動確認してください。

## Current UI Scope
- 記録登録モーダル（新規登録）
- 同一モーダルを使った記録編集（同じ入力UI）
- 入力項目:
  - 対戦日時
  - スコア
