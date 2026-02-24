from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'mfstat.db'}"

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

MATCH_RECORD_REQUIRED_COLUMNS = {
    "id",
    "played_at",
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
    "opponent_rate_band",
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
        _sync_match_record_result_values()
        existing_columns = _match_record_columns()
        if not MATCH_RECORD_REQUIRED_COLUMNS.issubset(existing_columns):
            with engine.begin() as connection:
                connection.exec_driver_sql("DROP TABLE matchrecord")
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
