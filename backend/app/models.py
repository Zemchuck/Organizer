from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Enum as SqlEnum
import enum
from datetime import datetime

from app.db import Base

class PriorityEnum(int, enum.Enum):
    URGENT_IMPORTANT         = 1   # pilne-ważne
    IMPORTANT_NOT_URGENT     = 2
    URGENT_NOT_IMPORTANT     = 3
    NOT_URGENT_NOT_IMPORTANT = 4

class TaskTypeEnum(str, enum.Enum):
    SINGLE = "single"   # jednorazowe
    HABIT  = "habit"

class Task(Base):
    __tablename__ = "tasks"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority    = Column(SqlEnum(PriorityEnum), nullable=False, default=PriorityEnum.NOT_URGENT_NOT_IMPORTANT)
    status      = Column(Boolean, nullable=False, default=False)
    task_type   = Column(SqlEnum(TaskTypeEnum), nullable=False, default=TaskTypeEnum.SINGLE)
    color       = Column(String(7), nullable=False, default="#CCCCCC")
    time        = Column(DateTime, nullable=False, default=datetime.utcnow)   # start
    duration    = Column(Integer, nullable=False, default=60)                 # minuty
