from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class MatchRecordBase(SQLModel):
    played_at: datetime
    rule: str = Field(min_length=1, max_length=64)
    stage: str = Field(min_length=1, max_length=200)
    my_score: int = Field(ge=0, le=8)
    opponent_score: int = Field(ge=0, le=8)
    my_character: str = Field(min_length=1, max_length=100)
    my_partner_character: Optional[str] = Field(default=None, max_length=100)
    opponent_character: str = Field(min_length=1, max_length=100)
    opponent_partner_character: Optional[str] = Field(default=None, max_length=100)
    my_racket: Optional[str] = Field(default=None, max_length=100)
    my_partner_racket: Optional[str] = Field(default=None, max_length=100)
    opponent_racket: Optional[str] = Field(default=None, max_length=100)
    opponent_partner_racket: Optional[str] = Field(default=None, max_length=100)
    my_rate: int = Field(ge=0)
    my_rate_band: str = Field(min_length=1, max_length=3)
    my_partner_rate_band: Optional[str] = Field(default=None, min_length=1, max_length=3)
    opponent_rate_band: str = Field(min_length=1, max_length=3)
    opponent_partner_rate_band: Optional[str] = Field(default=None, min_length=1, max_length=3)
    opponent_player_name: Optional[str] = Field(default=None, max_length=100)
    my_partner_player_name: Optional[str] = Field(default=None, max_length=100)
    opponent_partner_player_name: Optional[str] = Field(default=None, max_length=100)


class MatchRecord(MatchRecordBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    season: str = Field(min_length=7, max_length=7)
    result: str = Field(min_length=1, max_length=10)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class MatchRecordCreate(MatchRecordBase):
    pass


class MatchRecordUpdate(SQLModel):
    played_at: Optional[datetime] = None
    rule: Optional[str] = Field(default=None, min_length=1, max_length=64)
    stage: Optional[str] = Field(default=None, min_length=1, max_length=200)
    my_score: Optional[int] = Field(default=None, ge=0, le=8)
    opponent_score: Optional[int] = Field(default=None, ge=0, le=8)
    my_character: Optional[str] = Field(default=None, min_length=1, max_length=100)
    my_partner_character: Optional[str] = Field(default=None, max_length=100)
    opponent_character: Optional[str] = Field(default=None, min_length=1, max_length=100)
    opponent_partner_character: Optional[str] = Field(default=None, max_length=100)
    my_racket: Optional[str] = Field(default=None, max_length=100)
    my_partner_racket: Optional[str] = Field(default=None, max_length=100)
    opponent_racket: Optional[str] = Field(default=None, max_length=100)
    opponent_partner_racket: Optional[str] = Field(default=None, max_length=100)
    my_rate: Optional[int] = Field(default=None, ge=0)
    my_rate_band: Optional[str] = Field(default=None, min_length=1, max_length=3)
    my_partner_rate_band: Optional[str] = Field(default=None, min_length=1, max_length=3)
    opponent_rate_band: Optional[str] = Field(default=None, min_length=1, max_length=3)
    opponent_partner_rate_band: Optional[str] = Field(default=None, min_length=1, max_length=3)
    opponent_player_name: Optional[str] = Field(default=None, max_length=100)
    my_partner_player_name: Optional[str] = Field(default=None, max_length=100)
    opponent_partner_player_name: Optional[str] = Field(default=None, max_length=100)


class MatchRecordRead(MatchRecordBase):
    id: int
    season: str
    result: str
    created_at: datetime
