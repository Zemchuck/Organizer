from api import calendar
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session


app = FastAPI(title="Organizer API")

# create tables on startup
Base.metadata.create_all(bind=engine)

@app.post("/entries/", response_model=CalendarEntryCreate)
def create_entry(entry: CalendarEntryCreate, db: Session = Depends(get_db)):
    """Create a new calendar entry and return it."""
    db_entry = CalendarEntry(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry
