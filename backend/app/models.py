from app.db import Base 
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum
from datetime import datetime
import enum

class TaskType(enum.Enum):
    single = "single"
    habit = "habit"
    
class Task(Base):
    __tablename__ = "Tasks"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    time= Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False)
    task_type = Column(
        SQLEnum(TaskType, name="task_type_enum", native_enum=False)
        , nullable=False,
        )


    def __repr__(self):
        return (f"<Task(id={self.id}, title={self.title!r}, "
                f"time={self.time}, duration={self.duration}, task_type={self.task_type})>")
    
    @property
    def end_time(self) -> datetime:
        from datetime import timedelta
        """Zwraca czas zakończenia zadania."""
        return self.time + timedelta(minutes=self.duration)