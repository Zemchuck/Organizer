from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.db import get_db
from app.models import CalendarEntry
from app.schemas import CalendarEntryCreate, CalendarEntryRead


app = FastAPI(title="Organizer API")

app.add_middleware(CORSMiddleware,               
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)


@app.get("/", response_model=List[CalendarEntryRead])
def read_entries(db: Session = Depends(get_db)):
    """Return all calendar entries."""
    return db.query(models.CalendarEntry).all()

#stworzenie nowego wpisu w kalendarzu
@app.post("/entries/", response_model=CalendarEntryCreate)
def create_entry(entry: CalendarEntryCreate, db: Session = Depends(get_db)):
    """Create a new calendar entry."""
    entry_model = models.CalendarEntry(**entry.dict())
    db.add(entry_model)
    db.commit()
    db.refresh(entry_model)
    return entry_model
   
