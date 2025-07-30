from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CalendarEntryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None


class CalendarEntryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None


class CalendarEntryRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None

    class Config:
        from_atributes = True  # Enable reading from ORM models