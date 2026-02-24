from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .database import get_session, init_db
from .models import MatchRecord, MatchRecordCreate, MatchRecordRead, MatchRecordUpdate

app = FastAPI(title="MFStat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/records", response_model=list[MatchRecordRead])
def list_records(session: Session = Depends(get_session)):
    statement = select(MatchRecord).order_by(MatchRecord.played_at.desc())
    return session.exec(statement).all()


@app.post("/records", response_model=MatchRecordRead, status_code=status.HTTP_201_CREATED)
def create_record(payload: MatchRecordCreate, session: Session = Depends(get_session)):
    record = MatchRecord.model_validate(payload)
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

    session.add(record)
    session.commit()
    session.refresh(record)
    return record
