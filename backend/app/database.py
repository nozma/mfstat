import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from .season import compute_season_from_played_at, parse_database_datetime

APP_NAME = "mfstat"
DATABASE_FILE_NAME = "mfstat.db"
LEGACY_DATABASE_PATH = Path(__file__).resolve().parent.parent / DATABASE_FILE_NAME


def _resolve_app_data_dir() -> Path:
    configured_data_dir = os.getenv("MFSTAT_DATA_DIR")
    if configured_data_dir:
        return Path(configured_data_dir).expanduser().resolve()

    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_NAME

    if sys.platform.startswith("win"):
        app_data = os.getenv("APPDATA")
        base_dir = Path(app_data) if app_data else Path.home() / "AppData" / "Roaming"
        return base_dir / APP_NAME

    xdg_data_home = os.getenv("XDG_DATA_HOME")
    if xdg_data_home:
        return Path(xdg_data_home) / APP_NAME
    return Path.home() / ".local" / "share" / APP_NAME


def _backup_and_migrate_legacy_database(target_database_path: Path) -> None:
    if not LEGACY_DATABASE_PATH.exists() or target_database_path.exists():
        return

    backup_dir = target_database_path.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_file = backup_dir / f"{DATABASE_FILE_NAME}.legacy-backup-{timestamp}"
    shutil.copy2(LEGACY_DATABASE_PATH, backup_file)
    shutil.move(str(LEGACY_DATABASE_PATH), str(target_database_path))


def _prepare_database_path() -> Path:
    data_dir = _resolve_app_data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)
    target_database_path = data_dir / DATABASE_FILE_NAME
    _backup_and_migrate_legacy_database(target_database_path)
    return target_database_path


DATABASE_PATH = _prepare_database_path()
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

MATCH_RECORD_REQUIRED_COLUMNS = {
    "id",
    "played_at",
    "season",
    "rule",
    "stage",
    "my_score",
    "opponent_score",
    "my_character",
    "my_partner_character",
    "opponent_character",
    "opponent_partner_character",
    "my_racket",
    "my_partner_racket",
    "opponent_racket",
    "opponent_partner_racket",
    "my_rate",
    "result",
    "my_rate_band",
    "my_partner_rate_band",
    "opponent_rate_band",
    "opponent_partner_rate_band",
    "opponent_player_name",
    "my_partner_player_name",
    "opponent_partner_player_name",
    "created_at"
}


def _ensure_match_record_result_column() -> None:
    existing_columns = _match_record_columns()
    if "result" in existing_columns:
        return

    with engine.begin() as connection:
        connection.exec_driver_sql("ALTER TABLE matchrecord ADD COLUMN result TEXT")
        connection.exec_driver_sql(
            """
            UPDATE matchrecord
            SET result = CASE
                WHEN my_score > opponent_score THEN 'WIN'
                WHEN my_score < opponent_score THEN 'LOSS'
                ELSE 'DRAW'
            END
            """
        )


def _sync_match_record_result_values() -> None:
    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            UPDATE matchrecord
            SET result = CASE
                WHEN my_score > opponent_score THEN 'WIN'
                WHEN my_score < opponent_score THEN 'LOSS'
                ELSE 'DRAW'
            END
            """
        )


def _ensure_match_record_partner_rate_band_columns() -> None:
    existing_columns = _match_record_columns()
    statements: list[str] = []
    if "my_partner_rate_band" not in existing_columns:
        statements.append("ALTER TABLE matchrecord ADD COLUMN my_partner_rate_band TEXT")
    if "opponent_partner_rate_band" not in existing_columns:
        statements.append("ALTER TABLE matchrecord ADD COLUMN opponent_partner_rate_band TEXT")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.exec_driver_sql(statement)


def _ensure_match_record_season_column() -> None:
    existing_columns = _match_record_columns()
    if "season" in existing_columns:
        return

    with engine.begin() as connection:
        connection.exec_driver_sql("ALTER TABLE matchrecord ADD COLUMN season TEXT")


def _sync_match_record_season_values() -> None:
    with engine.begin() as connection:
        rows = connection.exec_driver_sql("SELECT id, played_at, season FROM matchrecord").fetchall()
        for row in rows:
            played_at = parse_database_datetime(row[1])
            if played_at is None:
                continue

            season = compute_season_from_played_at(played_at)
            if row[2] == season:
                continue

            connection.exec_driver_sql(
                "UPDATE matchrecord SET season = ? WHERE id = ?",
                (season, row[0])
            )


def _match_record_table_exists() -> bool:
    with engine.connect() as connection:
        result = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='matchrecord'"
        )
        return result.first() is not None


def _match_record_columns() -> set[str]:
    with engine.connect() as connection:
        result = connection.exec_driver_sql("PRAGMA table_info(matchrecord)")
        return {row[1] for row in result.fetchall()}


def init_db() -> None:
    if _match_record_table_exists():
        _ensure_match_record_result_column()
        _ensure_match_record_partner_rate_band_columns()
        _ensure_match_record_season_column()
        _sync_match_record_result_values()
        _sync_match_record_season_values()
        existing_columns = _match_record_columns()
        if not MATCH_RECORD_REQUIRED_COLUMNS.issubset(existing_columns):
            with engine.begin() as connection:
                connection.exec_driver_sql("DROP TABLE matchrecord")
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
