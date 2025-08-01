import enum
from datetime import datetime, timedelta

from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    Enum as SQLEnum,
)

from .db import Base          # ← import bazy


class TaskType(enum.Enum):
    single = "single"
    habit  = "habit"


class Task(Base):
    __tablename__ = "tasks"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(200), nullable=False)
    description = Column(Text)
    time        = Column(DateTime, nullable=False)   # start
    duration    = Column(Integer, nullable=False)    # minuty
    task_type   = Column(
        SQLEnum(TaskType, name="task_type_enum", native_enum=False),
        nullable=False,
    )

    # wygodne „pole” obliczane:
    @property
    def end_time(self) -> datetime:
        return self.time + timedelta(minutes=self.duration)

    def __repr__(self) -> str:
        return (
            f"<Task(id={self.id}, title={self.title!r}, "
            f"time={self.time}, duration={self.duration}, "
            f"task_type={self.task_type})>"
        )