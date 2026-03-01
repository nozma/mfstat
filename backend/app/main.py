import os
import sys
import logging
import subprocess
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from .database import get_session, init_db
from .models import MatchRecord, MatchRecordCreate, MatchRecordRead, MatchRecordUpdate
from .season import compute_season_from_played_at

app = FastAPI(title="MFStat API")
logger = logging.getLogger("mfstat.api")


def _resolve_cors_origins() -> list[str]:
    configured = os.getenv("MFSTAT_CORS_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://0.0.0.0:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://0.0.0.0:8000"
    ]


def _resolve_cors_origin_regex() -> str:
    configured = os.getenv("MFSTAT_CORS_ORIGIN_REGEX")
    if configured:
        return configured
    return r"^http://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$"


def _resolve_frontend_dist_dir() -> Path | None:
    candidates: list[Path] = []
    bundled_base_dir = getattr(sys, "_MEIPASS", None)
    if bundled_base_dir:
        candidates.append(Path(bundled_base_dir) / "frontend" / "dist")
    candidates.append(Path(__file__).resolve().parents[2] / "frontend" / "dist")

    for candidate in candidates:
        if (candidate / "index.html").exists():
            return candidate
    return None


FRONTEND_DIST_DIR = _resolve_frontend_dist_dir()
PROJECT_ROOT_DIR = Path(__file__).resolve().parents[2]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_resolve_cors_origins(),
    allow_origin_regex=_resolve_cors_origin_regex(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

if FRONTEND_DIST_DIR and (FRONTEND_DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="frontend-assets")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


def compute_result(my_score: int, opponent_score: int) -> str:
    if my_score > opponent_score:
        return "WIN"
    if my_score < opponent_score:
        return "LOSS"
    return "DRAW"


def _resolve_runtime_app_version() -> str:
    tag_result = subprocess.run(
        ["git", "-C", str(PROJECT_ROOT_DIR), "tag", "--points-at", "HEAD"],
        check=False,
        capture_output=True,
        text=True
    )
    if tag_result.returncode == 0:
        tag = next((line.strip() for line in tag_result.stdout.splitlines() if line.strip()), "")
        if tag:
            return tag

    sha_result = subprocess.run(
        ["git", "-C", str(PROJECT_ROOT_DIR), "rev-parse", "--short", "HEAD"],
        check=False,
        capture_output=True,
        text=True
    )
    short_sha = sha_result.stdout.strip() if sha_result.returncode == 0 else ""

    latest_tag_result = subprocess.run(
        ["git", "-C", str(PROJECT_ROOT_DIR), "describe", "--tags", "--abbrev=0"],
        check=False,
        capture_output=True,
        text=True
    )
    latest_tag = latest_tag_result.stdout.strip() if latest_tag_result.returncode == 0 else ""
    if latest_tag and short_sha:
        return f"{latest_tag}+{short_sha}"

    if short_sha:
        return f"dev-{short_sha}"

    return os.getenv("MFSTAT_APP_VERSION", "unknown")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/app-version")
def app_version():
    return {"version": _resolve_runtime_app_version()}


@app.get("/records", response_model=list[MatchRecordRead])
def list_records(session: Session = Depends(get_session)):
    statement = select(MatchRecord).order_by(MatchRecord.played_at.desc())
    return session.exec(statement).all()


@app.post("/records", response_model=MatchRecordRead, status_code=status.HTTP_201_CREATED)
def create_record(payload: MatchRecordCreate, session: Session = Depends(get_session)):
    payload_data = payload.model_dump()
    payload_data["season"] = compute_season_from_played_at(payload.played_at)
    payload_data["result"] = compute_result(payload.my_score, payload.opponent_score)
    record = MatchRecord.model_validate(payload_data)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@app.put("/records/{record_id}", response_model=MatchRecordRead)
def update_record(
    record_id: int,
    payload: MatchRecordUpdate,
    session: Session = Depends(get_session)
):
    record = session.get(MatchRecord, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)
    record.season = compute_season_from_played_at(record.played_at)
    record.result = compute_result(record.my_score, record.opponent_score)

    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@app.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, session: Session = Depends(get_session)):
    record = session.get(MatchRecord, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    session.delete(record)
    session.commit()


@app.get("/", include_in_schema=False)
def serve_index():
    if FRONTEND_DIST_DIR is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frontend build not found")
    return FileResponse(FRONTEND_DIST_DIR / "index.html")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str):
    if FRONTEND_DIST_DIR is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frontend build not found")

    requested_path = full_path.lstrip("/")
    if requested_path:
        candidate = (FRONTEND_DIST_DIR / requested_path).resolve()
        if FRONTEND_DIST_DIR in candidate.parents and candidate.is_file():
            return FileResponse(candidate)

    return FileResponse(FRONTEND_DIST_DIR / "index.html")
