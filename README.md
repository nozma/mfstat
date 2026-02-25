# MFStat

マリオテニスフィーバーのランクマッチ結果を記録する、個人向けローカルWebアプリです。

## 技術スタック
- Frontend: React + Vite + TypeScript
- Backend: FastAPI + SQLModel
- DB: SQLite

## セットアップ

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## 開発起動
```bash
make dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## デスクトップ起動
```bash
make desktop
```

## DB保存先
- macOS: `~/Library/Application Support/mfstat/mfstat.db`
- Windows: `%APPDATA%/mfstat/mfstat.db`
- Linux: `$XDG_DATA_HOME/mfstat/mfstat.db`（未設定時: `~/.local/share/mfstat/mfstat.db`）
