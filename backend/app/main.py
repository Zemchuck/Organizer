from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas
from db import get_db
from schemas import CalendarEntryCreate, CalendarEntryRead
from models import CalendarEntry

app = FastAPI(title="Organizer API")




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
    db.close()
    return entry_model
   
