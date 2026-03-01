from datetime import UTC, datetime, timedelta

JST_OFFSET = timedelta(hours=9)


def compute_season_from_played_at(played_at: datetime) -> str:
    if played_at.tzinfo is None:
        utc_played_at = played_at - JST_OFFSET
    else:
        utc_played_at = played_at.astimezone(UTC).replace(tzinfo=None)
    return utc_played_at.strftime("%Y/%m")


def parse_database_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None
