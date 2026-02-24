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

## Run
```bash
make dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Current UI Scope
- 記録登録モーダル（新規登録）
- 同一モーダルを使った記録編集（同じ入力UI）
- 入力項目:
  - 対戦日時
  - スコア
