from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class MatchRecordBase(SQLModel):
    played_at: datetime
    score: str = Field(min_length=1, max_length=100)


class MatchRecord(MatchRecordBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class MatchRecordCreate(MatchRecordBase):
    pass


class MatchRecordUpdate(SQLModel):
    played_at: Optional[datetime] = None
    score: Optional[str] = Field(default=None, min_length=1, max_length=100)


class MatchRecordRead(MatchRecordBase):
    id: int
    created_at: datetime
