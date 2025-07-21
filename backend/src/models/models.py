
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

#Tabela wpisów kalendarza
class CalendarEntry(Base):
    __tablename__ = "calendar_entries"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime)
    location = Column(String(200))
    
    def __repr__(self):
        return (f"<CalendarEntry(id={self.id}, title={self.title!r}, "
                f"start={self.start_datetime}, end={self.end_datetime})>")